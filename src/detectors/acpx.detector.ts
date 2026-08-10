// src/detectors/acpx.detector.ts
import type { AgentDetector, DetectedAgent } from '../types.js';
import { which } from '../detect/utils.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const detector: AgentDetector = {
  name: 'acpx',

  async detect(): Promise<DetectedAgent | null> {
    const binary = await which('acpx');
    if (!binary) {
      return null;
    }

    try {
      const { stdout } = await execFileAsync(binary, ['list'], { timeout: 5000 });
      const targets = stdout
        .trim()
        .split('\n')
        .filter((t) => t.trim().length > 0);

      return {
        name: 'acpx',
        binary,
        isACPAgent: true,
        isConfigured: targets.length > 0,
        // 'probe' only when targets were found; zero targets means the probe
        // ran but proved nothing, so no configSource (same for the catch below).
        ...(targets.length > 0 ? { configSource: 'probe' as const } : {}),
        metadata: { targets },
      };
    } catch {
      // list command failed - return agent with empty targets
      return {
        name: 'acpx',
        binary,
        isACPAgent: true,
        isConfigured: false,
        metadata: { targets: [] },
      };
    }
  },
};

export default detector;
