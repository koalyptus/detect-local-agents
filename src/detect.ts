import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { getPlatform } from './detect/platform.js';

const execFileAsync = promisify(execFile);

async function getNpmPrefix(): Promise<string | null> {
  // npm sets npm_config_prefix as an env var when running under npm scripts.
  // When running directly (node foo.js) we fall back to spawning the CLI.
  if (process.env.npm_config_prefix) {
    return process.env.npm_config_prefix;
  }
  try {
    const { stdout } = await execFileAsync('npm', ['config', 'get', 'prefix'], {
      timeout: 3000,
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Find a binary in PATH. Returns absolute path or null.
 * Falls back to checking the npm global bin directory when PATH fails.
 */
export async function which(name: string): Promise<string | null> {
  const cmd = getPlatform() === 'win32' ? 'where' : 'which';
  try {
    const { stdout } = await execFileAsync(cmd, [name], { timeout: 5000 });
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
  for (const candidate of candidates) {
    const binPath = join(binDir, candidate);
    try {
      await access(binPath);
      return binPath;
    } catch {
      // Try next candidate
    }
  }
  return null;
}

/**
 * Get version string by running a command. Returns version or null.
 */
export async function getVersion(
  binary: string,
  args: string[] = ['--version'],
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(binary, args, { timeout: 5000 });
    const match = stdout.trim().match(/(\d+\.\d+[\d.]*)/);
    return match?.[1] ?? stdout.trim();
  } catch {
    return null;
  }
}
