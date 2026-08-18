import type { AgentDetector, DetectedAgent } from '../types.js';
import { which, getVersion, withConfigSource } from '../detect/utils.js';

const detector: AgentDetector = {
  id: 'augment-cli',

  async detect(): Promise<DetectedAgent | null> {
    const binary = await which('auggie');
    if (!binary) {
      return null;
    }

    const version = (await getVersion(binary)) ?? undefined;

    // Vercel's spec uses env_set AUGMENT_AGENT for runtime detection
    const isConfigured = !!process.env['AUGMENT_AGENT'];

    return withConfigSource(
      { id: 'augment-cli', name: 'augment-cli', binary, version, isConfigured },
      isConfigured ? 'env' : undefined,
    );
  },
};

export default detector;
