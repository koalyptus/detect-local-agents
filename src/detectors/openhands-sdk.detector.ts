import type { AgentDetector, DetectedAgent } from '../types.js';
import { findPipPackage } from '../detect/pip.js';

const detector: AgentDetector = {
  name: 'openhands-sdk',

  async detect(): Promise<DetectedAgent | null> {
    const pkg = await findPipPackage('openhands-sdk');
    if (!pkg) {
      return null;
    }

    return {
      name: 'openhands-sdk',
      binary: 'openhands-sdk',
      version: pkg.version,
    };
  },
};

export default detector;
