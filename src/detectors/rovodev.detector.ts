// src/detectors/rovodev.detector.ts
import type { AgentDetector, DetectedAgent } from '../types.js';
import { which } from '../detect/utils.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const detector: AgentDetector = {
  name: 'rovodev',

  async detect(): Promise<DetectedAgent | null> {
    const binary = await which('acli');
    if (!binary) {
      return null;
    }

    // Special probe: acli rovodev --help
    try {
      const { stdout } = await execFileAsync(binary, ['rovodev', '--help'], { timeout: 5000 });
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
      metadata: { acliBinary: binary },
    };
  },
};

export default detector;
