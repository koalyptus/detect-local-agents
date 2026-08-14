// src/detectors/rovodev.detector.ts
import type { AgentDetector, DetectedAgent, DetectOptions } from '../types.js';
import { which } from '../detect/utils.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { VERSION_PROBE_TIMEOUT } from '../detect/utils.js';

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT = VERSION_PROBE_TIMEOUT;

/** Create the rovodev detector with optional probe/timeout configuration. */
export function createRovodevDetector(options?: DetectOptions): AgentDetector {
  const probe = options?.probe ?? true;
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

  return {
    name: 'rovodev',

    async detect(): Promise<DetectedAgent | null> {
      const binary = await which('acli');
      if (!binary) {
        return null;
      }

      if (probe === false) {
        return {
          name: 'rovodev',
          binary,
          isConfigured: undefined,
        };
      }

      // Special probe: acli rovodev --help
      try {
        const { stdout } = await execFileAsync(binary, ['rovodev', '--help'], {
          timeout,
        });
        if (!stdout.length) {
          return null;
        }
      } catch {
        return null;
      }

      return {
        name: 'rovodev',
        binary,
        isConfigured: true,
        configSource: 'probe',
        metadata: { acliBinary: binary },
      };
    },
  };
}

export default createRovodevDetector;