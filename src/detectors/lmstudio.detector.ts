import type { AgentDetector, ConfigSource, DetectedAgent } from '../types.js';
import { which, getVersion, configSourceFromDir, withConfigSource } from '../detect/utils.js';
import { getPlatform } from '../detect/platform.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Resolve LM Studio's platform-specific config/data home directory.
 *
 * LM Studio stores its data in platform-specific locations:
 * - Linux:   ~/.lmstudio/
 * - macOS:   ~/Library/Application Support/lmstudio/
 * - Windows: %LOCALAPPDATA%\lmstudio\
 *
 * The directory is created on first run of the LM Studio desktop
 * app, so its presence indicates the agent is configured.
 */
function getLmStudioHome(): string | null {
  const platform = getPlatform();
  const home = process.env.HOME || homedir();

  if (platform === 'linux') {
    return home ? join(home, '.lmstudio') : null;
  }
  if (platform === 'darwin') {
    return home ? join(home, 'Library', 'Application Support', 'lmstudio') : null;
  }
  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      return join(localAppData, 'lmstudio');
    }
    return null;
  }
  return null;
}

const detector: AgentDetector = {
  id: 'lmstudio',

  async detect(): Promise<DetectedAgent | null> {
    const binary = await which('lms');
    if (!binary) {
      return null;
    }

    const version = (await getVersion(binary)) ?? undefined;

    // LM Studio has no API-key env var; "configured" means the desktop
    // app has been run at least once (home dir was created).
    const homeDir = getLmStudioHome();
    const configSource: ConfigSource | undefined = homeDir
      ? await configSourceFromDir(homeDir)
      : undefined;
    const isConfigured = configSource !== undefined;

    return withConfigSource(
      { id: 'lmstudio', name: 'lmstudio', binary, version, isConfigured },
      configSource,
    );
  },
};

export default detector;
