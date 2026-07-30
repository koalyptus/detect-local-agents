import type { AgentDetector, DetectedAgent } from '../types.js';
import { which } from '../detect.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { getPlatform } from '../detect/platform.js';

const detector: AgentDetector = {
  name: 'windsurf',

  async detect(): Promise<DetectedAgent | null> {
    // Windsurf is an IDE — check for its CLI/backend binary
    const binaryNames = ['windsurf', 'codeium'];
    let binary: string | null = null;

    for (const name of binaryNames) {
      const result = await which(name);
      if (result) {
        binary = result;
        break;
      }
    }

    if (!binary) {
      // Also check common install locations for the desktop IDE
      const commonPaths: string[] = [];
      const platform = getPlatform();
      if (platform === 'linux') {
        commonPaths.push('/opt/Windsurf/windsurf', '/usr/bin/windsurf', '/usr/local/bin/windsurf');
      } else if (platform === 'darwin') {
        commonPaths.push(
          '/Applications/Windsurf.app/Contents/MacOS/windsurf',
          '~/Applications/Windsurf.app/Contents/MacOS/windsurf',
        );
      }

      for (const p of commonPaths) {
        const resolved = p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
        try {
          await fs.access(resolved);
          binary = resolved;
          break;
        } catch {
          continue;
        }
      }

      if (!binary) {
        return null;
      }
    }

    // Check for Codeium/Windsurf config directory
    const configDirs = [path.join(os.homedir(), '.codeium'), path.join(os.homedir(), '.windsurf')];

    let isConfigured = false;
    for (const dir of configDirs) {
      try {
        await fs.access(dir);
        isConfigured = true;
        break;
      } catch {
        continue;
      }
    }

    return {
      name: 'windsurf',
      binary,
      isConfigured,
      isACPAgent: true,
    };
  },
};

export default detector;
