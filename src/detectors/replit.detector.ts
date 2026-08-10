import type { AgentDetector, DetectedAgent } from '../types.js';
import { which, getVersion, withConfigSource } from '../detect/utils.js';

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

    return withConfigSource(
      { name: 'replit', binary, version, isConfigured },
      isConfigured ? 'env' : undefined,
    );
  },
};

export default detector;
