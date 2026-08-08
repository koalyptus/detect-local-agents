import { exec as execCb, execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { getPlatform } from './platform.js';

/** Timeout for quick CLI probes (npm config, which/where). */
const NPM_TIMEOUT = 3000;
const COMMAND_TIMEOUT = 10_000;

/** Matches a dotted version string like "1.0.76" or "1.0.76.1". */
const VERSION_REGEX = /(\d+\.\d+(?:\.\d+)*)/;

/** PE VS_FIXEDFILEINFO signature (little-endian bytes for 0xFEEF04BD). */
const PE_VERSION_SIGNATURE = Buffer.from([0xbd, 0x04, 0xef, 0xfe]);

const execAsync = promisify(execCb);
const execFileAsync = promisify(execFile);

/**
 * Read the product version from a Windows PE (.exe/.dll) file by locating
 * VS_FIXEDFILEINFO in the binary.  No child process required.
 * Returns null on any read/parse failure or non-PE files.
 */
async function getWindowsFileVersion(binaryPath: string): Promise<string | null> {
  try {
    const buffer = await readFile(binaryPath);
    // VS_FIXEDFILEINFO signature 0xFEEF04BD — scan the binary for the
    // 4-byte signature; once located, the file version fields sit 8 and
    // 12 bytes after it.
    const found = buffer.indexOf(PE_VERSION_SIGNATURE);
    if (found === -1 || found + 16 > buffer.length) {
      return null;
    }
    const fileVersionMS = buffer.readUInt32LE(found + 8);
    const fileVersionLS = buffer.readUInt32LE(found + 12);
    const major = (fileVersionMS >>> 16) & 0xffff;
    const minor = fileVersionMS & 0xffff;
    const build = (fileVersionLS >>> 16) & 0xffff;
    const revision = fileVersionLS & 0xffff;
    let version = `${major}.${minor}`;
    if (build !== 0 || revision !== 0) {
      version += `.${build}`;
    }
    if (revision !== 0) {
      version += `.${revision}`;
    }
    return version;
  } catch {
    return null;
  }
}

async function getNpmPrefix(): Promise<string | null> {
  // npm sets npm_config_prefix as an env var when running under npm scripts.
  // When running directly (node foo.js) we fall back to spawning the CLI.
  if (process.env.npm_config_prefix) {
    return process.env.npm_config_prefix;
  }
  try {
    const { stdout } = await execFileAsync('npm', ['config', 'get', 'prefix'], {
      timeout: NPM_TIMEOUT,
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Return the first path in `candidates` that exists on disk.
 */
async function firstExisting(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try next candidate
    }
  }
  return null;
}

/**
 * Resolve a binary path to something CreateProcess can actually spawn.
 * On Windows, npm installs .cmd/.exe shims (e.g. claude.cmd) rather than
 * extension-less binaries, and CreateProcess cannot execute .cmd/.bat files
 * at all — those need cmd.exe. Returns the resolved path or null.
 */
async function resolveWindowsShim(binary: string): Promise<string | null> {
  // Real executables spawn directly.
  if (/\.(exe|com)$/i.test(binary)) {
    return binary;
  }
  // Prefer the .cmd shim (what npm installs), then .exe, then the bare
  // launcher as a last resort (some extension-less PE files still work).
  return firstExisting([`${binary}.cmd`, `${binary}.exe`, binary]);
}

/**
 * Find a binary in PATH. Returns absolute path or null.
 * Falls back to checking the npm global bin directory when PATH fails.
 */
export async function which(name: string): Promise<string | null> {
  const cmd = getPlatform() === 'win32' ? 'where' : 'which';
  try {
    const { stdout } = await execFileAsync(cmd, [name], { timeout: COMMAND_TIMEOUT });
    // Split on CRLF or LF and take the first match. A plain split('\n') leaves
    // a trailing \r on Windows multi-match output (C:\node.exe\r), which breaks
    // any later path operations.
    const first = stdout.split(/\r?\n/)[0]?.trim();
    if (first) {
      return first;
    }
  } catch {
    // Fall through to npm prefix check
  }

  // npm global prefix fallback
  const prefix = await getNpmPrefix();
  if (!prefix) {
    return null;
  }

  const binDir = getPlatform() === 'win32' ? prefix : join(prefix, 'bin');
  // On Windows, npm installs .cmd/.exe shims (e.g. claude.cmd) rather than
  // extension-less binaries — check those when the bare name isn't present.
  const candidates = getPlatform() === 'win32' ? [name, `${name}.cmd`, `${name}.exe`] : [name];
  return firstExisting(candidates.map((candidate) => join(binDir, candidate)));
}

/**
 * Get version string by running a command. Returns version or null.
 * On Windows, resolves npm .cmd/.exe shims and runs .cmd/.bat through the
 * shell via exec() — a single command string avoids DEP0190 and properly
 * handles spaces in paths.  Falls back to reading the PE embedded version
 * when --version does not work (e.g. Electron desktop apps).
 */
export async function getVersion(
  binary: string,
  args: string[] = ['--version'],
): Promise<string | null> {
  const isWin = getPlatform() === 'win32';
  const resolved = isWin ? await resolveWindowsShim(binary) : binary;
  if (!resolved) {
    return null;
  }
  try {
    const needsShell = isWin && /\.(cmd|bat)$/i.test(resolved);
    // .cmd/.bat shims only execute through cmd.exe. Use exec() (single
    // command string) rather than execFile + shell:true — execFile with
    // shell and an args array triggers Node 22's DEP0190 and doesn't quote
    // spaces in the path correctly.
    const { stdout } = needsShell
      ? await execAsync(`"${resolved}" ${args.join(' ')}`, { timeout: COMMAND_TIMEOUT })
      : await execFileAsync(resolved, args, { timeout: COMMAND_TIMEOUT });
    // Match dotted segments only (no trailing dot): "1.0.76." -> "1.0.76".
    const match = stdout.trim().match(VERSION_REGEX);
    return match?.[1] ?? stdout.trim();
  } catch {
    // --version may not be supported (e.g. Electron desktop apps).
    // Fall back to reading the PE embedded version on Windows.
    if (isWin) {
      return getWindowsFileVersion(resolved);
    }
    return null;
  }
}
