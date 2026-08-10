import type { AgentDetector, ConfigSource, DetectedAgent } from '../types.js';
import { which, getVersion, configSourceFromDir, withConfigSource } from '../detect/utils.js';
import { getPlatform } from '../detect/platform.js';
import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

/**
 * T3 Code — https://t3.codes/
 * Open-source control plane for coding agents.
 * Available as both an Electron desktop app and an npm CLI (`t3`).
 * Detection checks PATH for both binary names, then falls back to
 * platform-specific install locations + config dir.
 */

// Candidate binary / app paths per platform (fallback when not on PATH).
// Checked in order; first hit wins.
const LINUX_PATHS = ['/opt/t3code/T3 Code', '/usr/local/bin/t3-code', '/opt/homebrew/bin/t3'];

const MACOS_PATHS = ['/Applications/T3 Code.app/Contents/MacOS/T3 Code', '/opt/homebrew/bin/t3'];

function getCommonPaths(platform: string): string[] {
  switch (platform) {
    case 'linux':
      return LINUX_PATHS;
    case 'darwin':
      return MACOS_PATHS;
    case 'win32': {
      // Resolve %LOCALAPPDATA% at runtime — fs.access does not expand env vars.
      const localAppData = process.env.LOCALAPPDATA;
      const candidates: string[] = [
        'C:\\Program Files\\T3 Code\\T3 Code.exe',
        'C:\\Program Files (x86)\\T3 Code\\T3 Code.exe',
      ];
      if (localAppData) {
        // The install dir uses a stable name (`t3code`) but the .exe name
        // includes a channel suffix like "T3 Code (Alpha).exe" that changes
        // across releases.  Scan the directory for any .exe that isn't the
        // uninstaller.
        const installDir = `${localAppData}\\Programs\\t3code`;
        candidates.push(installDir);
      }
      return candidates;
    }
    default:
      return [];
  }
}

/**
 * Resolve the user-data/config directory that marks T3 Code as configured.
 * Derived from the upstream DesktopEnvironment.ts userDataDirName logic:
 * - Linux:   ~/.config/t3code
 * - macOS:   ~/Library/Application Support/t3code
 * - Windows: %APPDATA%/t3code
 */
function getConfigDir(platform: string): string | null {
  const home = process.env.HOME || homedir();
  if (!home) {
    return null;
  }
  switch (platform) {
    case 'linux':
      return join(home, '.config', 't3code');
    case 'darwin':
      return join(home, 'Library', 'Application Support', 't3code');
    case 'win32':
      // Use forward slashes — Windows APIs accept both, and this avoids
      // platform-specific path.join separator issues when running on non-Windows.
      if (process.env.APPDATA) {
        return `${process.env.APPDATA}/t3code`;
      }
      return null;
    default:
      return null;
  }
}

const detector: AgentDetector = {
  name: 't3-code',

  async detect(): Promise<DetectedAgent | null> {
    // 1. Try PATH — desktop app CLI alias first, then npm CLI name
    let binary = await which('t3');

    // 2. Fall back to platform-specific install paths
    const platform = getPlatform();
    if (!binary) {
      const paths = getCommonPaths(platform);
      for (const p of paths) {
        try {
          const stat = await fs.stat(p);
          if (stat.isDirectory()) {
            // Scan directory for .exe files (Windows install dirs)
            const entries = await fs.readdir(p);
            const exe = entries.find(
              (e) => e.endsWith('.exe') && !e.toLowerCase().includes('uninstall'),
            );
            if (exe) {
              binary = join(p, exe);
              break;
            }
          } else {
            binary = p;
            break;
          }
        } catch {
          // try next candidate
        }
      }
    }

    if (!binary) {
      return null;
    }

    const version = (await getVersion(binary)) ?? undefined;

    // 3. isConfigured: the user-data/config directory must exist
    const configDir = getConfigDir(platform);
    const configSource: ConfigSource | undefined = configDir
      ? await configSourceFromDir(configDir)
      : undefined;
    const isConfigured = configSource !== undefined;

    return withConfigSource({ name: 't3-code', binary, version, isConfigured }, configSource);
  },
};

export default detector;
