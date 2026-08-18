import type { AgentDetector, ConfigSource, DetectedAgent } from '../types.js';
import { which, getVersion, configSourceFromDir, withConfigSource } from '../detect/utils.js';
import { join } from 'node:path';
import { homedir } from 'node:os';

const detector: AgentDetector = {
  id: 'antigravity',

  async detect(): Promise<DetectedAgent | null> {
    // Check both binary names: agy (current codename) and gemini (legacy name)
    const agyBinary = await which('agy');
    const geminiBinary = await which('gemini');
    const binary = agyBinary ?? geminiBinary;
    if (!binary) {
      return null;
    }

    const displayName = agyBinary ? 'antigravity' : 'gemini_cli';
    const version = (await getVersion(binary)) ?? undefined;

    // Check configured status: env vars or config directory
    const envConfigured = !!(process.env['GOOGLE_API_KEY'] ?? process.env['ANTIGRAVITY_API_KEY']);
    const configSource: ConfigSource | undefined = envConfigured
      ? 'env'
      : await configSourceFromDir(join(homedir(), '.gemini'));
    const isConfigured = configSource !== undefined;

    return withConfigSource(
      { id: 'antigravity', name: displayName, binary, version, isConfigured },
      configSource,
    );
  },
};

export default detector;
