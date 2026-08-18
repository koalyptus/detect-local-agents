import type { AgentDetector, DetectedAgent } from '../types.js';
import { findPipPackage } from '../detect/pip.js';

const detector: AgentDetector = {
  id: 'openhands-sdk',

  async detect(): Promise<DetectedAgent | null> {
    const pkg = await findPipPackage('openhands-sdk');
    if (!pkg) {
      return null;
    }

    return {
      id: 'openhands-sdk',
      name: 'openhands-sdk',
      binary: 'openhands-sdk',
      version: pkg.version,
    };
  },
};

export default detector;
