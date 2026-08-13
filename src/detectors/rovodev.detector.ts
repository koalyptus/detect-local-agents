// src/detectors/rovodev.detector.ts
import type { AgentDetector, DetectedAgent } from '../types.js';
import { which } from '../detect/utils.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

let rovodevProbe: boolean | undefined;
let rovodevTimeout: number | undefined;

export function setRovodevDetectorOptions(probe?: boolean, timeout?: number) {
  rovodevProbe = probe;
  rovodevTimeout = timeout;
}

const detector: AgentDetector = {
  name: 'rovodev',

  async detect(): Promise<DetectedAgent | null> {
    const probe = rovodevProbe;
    const timeout = rovodevTimeout;
    rovodevProbe = undefined;
    rovodevTimeout = undefined;

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
        timeout: timeout ?? 5000,
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

export default detector;
