// src/detect.ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Find a binary in PATH. Returns absolute path or null.
 */
export async function which(name: string): Promise<string | null> {
  const cmd = process.platform === 'win32' ? 'where' : 'which';
  try {
    const { stdout } = await execFileAsync(cmd, [name], { timeout: 5000 });
    const first = stdout.trim().split('\n')[0];
    return first || null;
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
