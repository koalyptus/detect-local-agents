// src/detectors/acpx.detector.ts
import type { AgentDetector, DetectedAgent, DetectOptions } from '../types.js';
import { which } from '../detect/utils.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT = 5_000;

/** Create the acpx detector with optional probe/timeout configuration. */
export function createAcpxDetector(options?: DetectOptions): AgentDetector {
  const probe = options?.probe ?? true;
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

  return {
    name: 'acpx',

    async detect(): Promise<DetectedAgent | null> {
      const binary = await which('acpx');
      if (!binary) {
        return null;
      }

      if (probe === false) {
        return {
          name: 'acpx',
          binary,
          isACPAgent: true,
          isConfigured: undefined,
        };
      }

      try {
        const { stdout } = await execFileAsync(binary, ['list'], { timeout });
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
}

export default createAcpxDetector;
