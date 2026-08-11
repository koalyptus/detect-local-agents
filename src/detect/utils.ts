import { exec as execCb, execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import * as os from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { getPlatform } from './platform.js';
import type { ConfigSource } from '../types.js';

/** Timeout for quick CLI probes (npm config, which/where). */
const NPM_TIMEOUT = 3000;
const COMMAND_TIMEOUT = 10_000;

/** Matches a dotted version string like "1.0.76" or "1.0.76.1". */
const VERSION_REGEX = /(\d+\.\d+(?:\.\d+)*)/;

const execAsync = promisify(execCb);
const execFileAsync = promisify(execFile);

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
 * Return platform-specific well-known global-CLI install directories.
 * Skips directories whose env var is unset (never joins onto undefined).
 * On POSIX, `~` is resolved from HOME or os.homedir() as a fallback.
 */
function getKnownInstallDirs(platform: string): string[] {
  const home = process.env.HOME ?? os.homedir();
  if (platform === 'win32') {
    const dirs: string[] = [];
    if (process.env.APPDATA) {
      dirs.push(join(process.env.APPDATA, 'npm'));
    }
    if (process.env.LOCALAPPDATA) {
      dirs.push(
        join(process.env.LOCALAPPDATA, 'Programs', 'nodejs'),
        join(process.env.LOCALAPPDATA, 'Volta', 'bin'),
        join(process.env.LOCALAPPDATA, 'pnpm'),
      );
    }
    if (process.env.USERPROFILE) {
      dirs.push(
        join(process.env.USERPROFILE, '.bun', 'bin'),
        join(process.env.USERPROFILE, 'scoop', 'shims'),
      );
    }
    return dirs;
  }
  return [
    join(home, '.local', 'bin'),
    join(home, '.bun', 'bin'),
    join(home, '.volta', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
  ];
}

/***
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
 * Find a binary by name. Returns absolute path or null.
 *
 * Lookup order:
 *   1. System PATH (via `which`/`where`)
 *   2. npm global prefix (e.g. /usr/local/bin or C:\node-prefix)
 *   3. Well-known install dirs (~/.local/bin, Volta, bun, Homebrew, etc.)
 *
 * Steps 1 and 2 are unchanged from before. Step 3 catches binaries
 * installed by Volta, pnpm, bun, scoop, curl scripts, and Homebrew
 * into locations that PATH and npm prefix don't cover.
 */
export async function which(name: string): Promise<string | null> {
  const isWin = getPlatform() === 'win32';
  const cmd = isWin ? 'where' : 'which';
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
  if (prefix) {
    const binDir = isWin ? prefix : join(prefix, 'bin');
    // On Windows, npm installs .cmd/.exe shims (e.g. claude.cmd) rather than
    // extension-less binaries — check those when the bare name isn't present.
    const candidates = isWin ? [name, `${name}.cmd`, `${name}.exe`] : [name];
    const npmResult = await firstExisting(candidates.map((candidate) => join(binDir, candidate)));
    if (npmResult) {
      return npmResult;
    }
  }

  // Well-known install directory fallback
  const knownDirs = getKnownInstallDirs(getPlatform());
  const knownCandidates = isWin ? [name, `${name}.cmd`, `${name}.exe`] : [name];
  for (const dir of knownDirs) {
    const result = await firstExisting(knownCandidates.map((c) => join(dir, c)));
    if (result) {
      return result;
    }
  }
  return null;
}

/**
 * Get version string by running a command. Returns version or null.
 * On Windows, resolves npm .cmd/.exe shims and runs .cmd/.bat through the
 * shell via exec() — a single command string avoids DEP0190 and properly
 * handles spaces in paths.
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
    const { stdout, stderr } = needsShell
      ? await execAsync(`"${resolved}" ${args.join(' ')}`, { timeout: COMMAND_TIMEOUT })
      : await execFileAsync(resolved, args, { timeout: COMMAND_TIMEOUT });
    // Match dotted segments only (no trailing dot): "1.0.76." -> "1.0.76".
    // stdout is authoritative; stderr is only a fallback for CLIs that print
    // their version banner to stderr. Concatenating both streams could pick
    // up a stray dotted number from a stderr warning, so try stdout first.
    const match = stdout.trim().match(VERSION_REGEX) ?? stderr.trim().match(VERSION_REGEX);
    return match?.[1] ?? stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Attach `configSource` to a detected agent when a source is known.
 * Callers pass a source only when the agent counts as configured, which keeps
 * the invariant "configSource set ⇒ isConfigured is true" a single decision
 * at each call site.
 */
export function withConfigSource<T extends object>(
  agent: T,
  configSource: ConfigSource | undefined,
): T & { configSource?: ConfigSource } {
  return configSource ? { ...agent, configSource } : agent;
}

/**
 * Return 'config-dir' when `dir` exists (even if empty), else undefined.
 * The config/user-data directory is the weakest "configured" signal: it is
 * created by a first run, even an aborted one.
 */
export async function configSourceFromDir(dir: string): Promise<ConfigSource | undefined> {
  try {
    await access(dir);
    return 'config-dir';
  } catch {
    return undefined;
  }
}
