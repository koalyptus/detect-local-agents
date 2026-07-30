import type { AgentDetector, DetectedAgent } from '../types.js';
import { findPipPackage } from '../detect/pip.js';

const detector: AgentDetector = {
  name: 'mini-coding-agent',

  async detect(): Promise<DetectedAgent | null> {
    const pkg = await findPipPackage('mini-coding-agent');
    if (!pkg) {
      return null;
    }

    return {
      name: 'mini-coding-agent',
      binary: 'mini-coding-agent',
      version: pkg.version,
    };
  },
};

export default detector;
