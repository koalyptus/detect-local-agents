// src/config-paths.ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Configuration path mapping for an agent.
 */
export interface ConfigPath {
  name: string;
  paths: string[];
}

/**
 * Known config file paths for config-based agents.
 * Supports cross-platform paths (Unix ~ and Windows %APPDATA%).
 */
export const AGENT_CONFIGS: Record<string, ConfigPath> = {
  claude: {
    name: 'claude',
    paths: [
      '~/.claude/settings.json',
      '%APPDATA%/Claude/settings.json',
    ],
  },
  codex: {
    name: 'codex',
    paths: [
      '~/.codex/config.json',
      '%APPDATA%/Codex/config.json',
    ],
  },
  opencode: {
    name: 'opencode',
    paths: [
      '~/.config/opencode/config.json',
      '%APPDATA%/opencode/config.json',
    ],
  },
  gemini: {
    name: 'gemini',
    paths: [
      '~/.gemini/config.json',
      '%APPDATA%/gemini/config.json',
    ],
  },
};

/**
 * Resolves a path that may contain ~ or %APPDATA% or %USERPROFILE%.
 */
function resolveConfigPath(p: string): string {
  if (p.startsWith('~')) {
    return path.join(os.homedir(), p.slice(1));
  }
  if (p.startsWith('%APPDATA%')) {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), p.slice(9));
  }
  if (p.startsWith('%USERPROFILE%')) {
    return path.join(process.env.USERPROFILE || os.homedir(), p.slice(13));
  }
  return p;
}

/**
 * Check if a config file exists for the given agent.
 * @param agentName - The agent name (key in AGENT_CONFIGS)
 * @returns true if any config file exists for the agent
 */
export async function hasConfigFile(agentName: string): Promise<boolean> {
  const config = AGENT_CONFIGS[agentName];
  if (!config) {
    return false;
  }

  for (const p of config.paths) {
    const resolvedPath = resolveConfigPath(p);
    try {
      await fs.access(resolvedPath);
      return true;
    } catch {
      // File doesn't exist, try next path
    }
  }

  return false;
}