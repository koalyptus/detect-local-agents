import type { AgentDetector, DetectedAgent } from '../types.js';
import { which, getVersion } from '../detect/utils.js';
import { getPlatform } from '../detect/platform.js';
import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

/**
 * T3 Code — https://t3.codes/
 * Open-source control plane for coding agents (Electron desktop app).
 * Distributed as native installers (AppImage, .app, .exe), not an npm PATH binary.
 * Detection falls back to platform-specific install locations + config dir.
 */

// Candidate binary / app paths per platform. Checked in order; first hit wins.
const LINUX_PATHS = ['/opt/t3code/T3 Code', '/usr/local/bin/t3-code'];

const MACOS_PATHS = ['/Applications/T3 Code.app/Contents/MacOS/T3 Code'];

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
        candidates.push(`${localAppData}\\Programs\\T3 Code\\T3 Code.exe`);
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
    // 1. Try PATH
    let binary = await which('t3-code');

    // 2. Fall back to platform-specific install paths
    const platform = getPlatform();
    if (!binary) {
      const paths = getCommonPaths(platform);
      for (const p of paths) {
        try {
          await fs.access(p);
          binary = p;
          break;
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
    let isConfigured = false;
    const configDir = getConfigDir(getPlatform());
    if (configDir) {
      try {
        await fs.access(configDir);
        isConfigured = true;
      } catch {
        // Not configured yet — app installed but never run
      }
    }

    return {
      name: 't3-code',
      binary,
      version,
      isConfigured,
    };
  },
};

export default detector;
