import type { AgentDetector, DetectedAgent } from '../types.js';
import { access } from 'node:fs/promises';

const DETEVIN_MARKER = '/opt/.devin';

const detector: AgentDetector = {
  id: 'devin',

  async detect(): Promise<DetectedAgent | null> {
    try {
      await access(DETEVIN_MARKER);
    } catch {
      return null;
    }

    return {
      id: 'devin',
      name: 'devin',
      binary: DETEVIN_MARKER,
      isConfigured: true,
    };
  },
};

export default detector;
