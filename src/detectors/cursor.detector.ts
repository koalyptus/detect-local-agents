// src/detectors/cursor.detector.ts
import type { AgentDetector, DetectedAgent } from '../types.js';
import { which } from '../detect.js';

const detector: AgentDetector = {
  name: 'cursor',

  async detect(): Promise<DetectedAgent | null> {
    const binary = await which('cursor-agent');
    if (!binary) {
      return null;
    }

    return {
      name: 'cursor',
      binary,
      isACPAgent: true,
      isConfigured: true,
    };
  },
};

export default detector;
