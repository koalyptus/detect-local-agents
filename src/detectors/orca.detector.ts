import type { AgentDetector, DetectedAgent } from '../types.js';
import { which } from '../detect-utils.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

const detector: AgentDetector = {
  name: 'orca',

  async detect(): Promise<DetectedAgent | null> {
    const binary = await which('orca');
    if (!binary) {
      return null;
    }

    // Check ~/.orca/ config directory which lists managed agents
    const orcaDir = path.join(os.homedir(), '.orca');
    let managedAgents: string[] = [];
    let isConfigured = false;

    try {
      await fs.access(orcaDir);
      isConfigured = true;
      // Try reading config files in .orca/ to list managed agents
      const entries = await fs.readdir(orcaDir);
      managedAgents = entries.filter(
        (e) => e.endsWith('.json') || e.endsWith('.yaml') || e.endsWith('.yml'),
      );
    } catch {
      // No config dir — not configured but binary exists
    }

    return {
      name: 'orca',
      binary,
      isConfigured,
      metadata: { managedAgents },
      isACPAgent: true,
    };
  },
};

export default detector;
