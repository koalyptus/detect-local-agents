import type { AgentDetector, DetectedAgent } from '../types.js';
import { which, getVersion } from '../detect-utils.js';

const detector: AgentDetector = {
  name: 'cursor',

  async detect(): Promise<DetectedAgent | null> {
    const binary = await which('cursor-agent');
    if (!binary) {
      return null;
    }

    const version = (await getVersion(binary)) ?? undefined;

    // Vercel's cursor-cli detection: CURSOR_AGENT env or CURSOR_EXTENSION_HOST_ROLE=agent-exec
    const isCursorCli =
      !!process.env['CURSOR_AGENT'] || process.env['CURSOR_EXTENSION_HOST_ROLE'] === 'agent-exec';

    return {
      name: isCursorCli ? 'cursor-cli' : 'cursor',
      binary,
      version,
      isACPAgent: true,
    };
  },
};

export default detector;
