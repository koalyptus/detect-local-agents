import type { AgentDetector, DetectedAgent } from '../types.js';
import { which, getVersion } from '../detect.js';

const detector: AgentDetector = {
  name: 'replit',

  async detect(): Promise<DetectedAgent | null> {
    const binary = await which('replit');
    if (!binary) {
      return null;
    }

    const version = (await getVersion(binary)) ?? undefined;

    // Vercel's spec uses env_set REPL_ID for runtime detection
    const isConfigured = !!process.env['REPL_ID'];

    return {
      name: 'replit',
      binary,
      version,
      isConfigured,
    };
  },
};

export default detector;
