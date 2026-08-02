import type { AgentDetector, DetectedAgent } from '../types.js';
import { findPipPackage } from '../detect/pip.js';
import { which, getVersion } from '../detect-utils.js';

const detector: AgentDetector = {
  name: 'swe-agent',

  async detect(): Promise<DetectedAgent | null> {
    // Check for binary first
    const binary = await which('sweagent');
    if (binary) {
      const version = (await getVersion(binary)) ?? undefined;
      return {
        name: 'swe-agent',
        binary,
        version,
        isConfigured: !!(process.env['OPENAI_API_KEY'] ?? process.env['ANTHROPIC_API_KEY']),
      };
    }

    // Fall back to pip detection
    const pkg = await findPipPackage('sweagent');
    if (!pkg) {
      return null;
    }

    return {
      name: 'swe-agent',
      binary: 'sweagent',
      version: pkg.version,
      isConfigured: !!(process.env['OPENAI_API_KEY'] ?? process.env['ANTHROPIC_API_KEY']),
    };
  },
};

export default detector;
