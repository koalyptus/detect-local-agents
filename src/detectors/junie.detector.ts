import type { AgentDetector, DetectedAgent } from '../types.js';
import { which, getVersion, withConfigSource } from '../detect/utils.js';

const detector: AgentDetector = {
  name: 'junie',

  async detect(): Promise<DetectedAgent | null> {
    const binary = await which('junie');
    if (!binary) {
      return null;
    }

    const version = (await getVersion(binary)) ?? undefined;

    // Vercel's spec uses env_set JUNIE_DATA | JUNIE_SHIM_PATH
    const isConfigured = !!(process.env['JUNIE_DATA'] ?? process.env['JUNIE_SHIM_PATH']);

    return withConfigSource(
      { name: 'junie', binary, version, isConfigured },
      isConfigured ? 'env' : undefined,
    );
  },
};

export default detector;
