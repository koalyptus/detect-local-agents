import type { AgentDetector, ConfigSource, DetectedAgent } from '../types.js';
import { which, configSourceFromDir, withConfigSource } from '../detect/utils.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

const detector: AgentDetector = {
  id: 'orca',

  async detect(): Promise<DetectedAgent | null> {
    const binary = await which('orca');
    if (!binary) {
      return null;
    }

    // Check ~/.orca/ config directory which lists managed agents
    const orcaDir = path.join(os.homedir(), '.orca');
    const configSource: ConfigSource | undefined = await configSourceFromDir(orcaDir);
    const isConfigured = configSource !== undefined;
    let managedAgents: string[] = [];

    if (isConfigured) {
      // Try reading config files in .orca/ to list managed agents
      try {
        const entries = await fs.readdir(orcaDir);
        managedAgents = entries.filter(
          (e) => e.endsWith('.json') || e.endsWith('.yaml') || e.endsWith('.yml'),
        );
      } catch {
        // Config dir exists but is not readable
      }
    }

    return withConfigSource(
      {
        id: 'orca',
        name: 'orca',
        binary,
        isConfigured,
        metadata: { managedAgents },
        isACPAgent: true,
      },
      configSource,
    );
  },
};

export default detector;
