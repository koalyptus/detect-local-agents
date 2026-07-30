// src/detect/pip.ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface PipPackage {
  name: string;
  version: string;
}

/**
 * Check if a pip package is installed by running `pip list --format=json`.
 * Returns the package info or null if not found.
 */
export async function findPipPackage(pkgName: string): Promise<PipPackage | null> {
  for (const pipCmd of ['pip', 'pip3']) {
    try {
      const { stdout } = await execFileAsync(
        pipCmd,
        ['list', '--format=json', '--disable-pip-version-check'],
        { timeout: 5000 },
      );

      const packages: PipPackage[] = JSON.parse(stdout);
      const found = packages.find((p) => p.name.toLowerCase() === pkgName.toLowerCase());
      if (found) {
        return found;
      }
    } catch {
      // Try next pip command
      continue;
    }
  }
  return null;
}

/**
 * Check if a pip package is installed via `pip show`
 * More precise than pip list for exact version info.
 */
export async function pipShow(pkgName: string): Promise<PipPackage | null> {
  for (const pipCmd of ['pip', 'pip3']) {
    try {
      const { stdout } = await execFileAsync(
        pipCmd,
        ['show', pkgName, '--disable-pip-version-check'],
        { timeout: 5000 },
      );

      const nameMatch = stdout.match(/^Name:\s*(.+)$/m);
      const versionMatch = stdout.match(/^Version:\s*(.+)$/m);

      if (nameMatch) {
        return {
          name: nameMatch[1]!.trim(),
          version: versionMatch?.[1]?.trim() ?? '0.0.0',
        };
      }
      return null;
    } catch {
      // Try next pip command
      continue;
    }
  }
  return null;
}
