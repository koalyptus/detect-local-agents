import type { AgentDetector, DetectedAgent, DetectOptions } from '../types.js';
import { which, VERSION_PROBE_TIMEOUT } from '../detect/utils.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const detector: AgentDetector = {
  name: 'rovodev',

  async detect(options?: DetectOptions): Promise<DetectedAgent | null> {
    const binary = await which('acli');
    if (!binary) {
      return null;
    }

    // probe:false — don't execute the binary to establish configuration state.
    // Presence (`which`) already ran; return "present, but we didn't probe".
    if (options?.probe === false) {
      return {
        name: 'rovodev',
        binary,
        isConfigured: undefined,
      };
    }

    // Special probe: acli rovodev --help
    try {
      const { stdout } = await execFileAsync(binary, ['rovodev', '--help'], {
        timeout: options?.timeout ?? VERSION_PROBE_TIMEOUT,
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
