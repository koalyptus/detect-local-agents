import type { AgentDetector, ConfigSource, DetectedAgent } from '../types.js';
import { which, getVersion } from '../detect/utils.js';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const detector: AgentDetector = {
  name: 'antigravity',

  async detect(): Promise<DetectedAgent | null> {
    // Check both binary names: agy (current codename) and gemini (legacy name)
    const agyBinary = await which('agy');
    const geminiBinary = await which('gemini');
    const binary = agyBinary ?? geminiBinary;
    if (!binary) {
      return null;
    }

    const name = agyBinary ? 'antigravity' : 'gemini';
    const version = (await getVersion(binary)) ?? undefined;

    // Check configured status: env vars or config directory
    const envConfigured = !!(process.env['GOOGLE_API_KEY'] ?? process.env['ANTIGRAVITY_API_KEY']);
    let isConfigured = envConfigured;
    let configSource: ConfigSource | undefined = envConfigured ? 'env' : undefined;
    if (!isConfigured) {
      try {
        const geminiDir = join(homedir(), '.gemini');
        await access(geminiDir);
        isConfigured = true;
        configSource = 'config-dir';
      } catch {
        // Not configured via config dir
      }
    }

    return {
      name,
      binary,
      version,
      isConfigured,
      ...(configSource ? { configSource } : {}),
    };
  },
};

export default detector;
