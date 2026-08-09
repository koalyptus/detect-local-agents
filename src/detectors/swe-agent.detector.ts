import type { AgentDetector, DetectedAgent } from '../types.js';
import { findPipPackage } from '../detect/pip.js';
import { which, getVersion, withConfigSource } from '../detect/utils.js';

const detector: AgentDetector = {
  name: 'swe-agent',

  async detect(): Promise<DetectedAgent | null> {
    // Same env expression at both return sites (binary branch and pip fallback)
    const isConfigured = !!(process.env['OPENAI_API_KEY'] ?? process.env['ANTHROPIC_API_KEY']);

    // Check for binary first
    const binary = await which('sweagent');
    if (binary) {
      const version = (await getVersion(binary)) ?? undefined;
      return withConfigSource(
        { name: 'swe-agent', binary, version, isConfigured },
        isConfigured ? 'env' : undefined,
      );
    }

    // Fall back to pip detection
    const pkg = await findPipPackage('sweagent');
    if (!pkg) {
      return null;
    }

    return withConfigSource(
      { name: 'swe-agent', binary: 'sweagent', version: pkg.version, isConfigured },
      isConfigured ? 'env' : undefined,
    );
  },
};

export default detector;
