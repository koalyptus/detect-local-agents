// src/detect.ts
import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

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
  const cmd = process.platform === 'win32' ? 'where' : 'which';
  try {
    const { stdout } = await execFileAsync(cmd, [name], { timeout: 5000 });
    const first = stdout.trim().split('\n')[0];
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

  const binDir = process.platform === 'win32' ? prefix : join(prefix, 'bin');
  const binPath = join(binDir, name);
  try {
    await access(binPath);
    return binPath;
  } catch {
    return null;
  }
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
