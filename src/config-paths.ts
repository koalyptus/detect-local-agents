// src/config-paths.ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { detectorConfigs } from './configs.js';

/**
 * Get standard config file paths for an agent.
 * Derives from detectorConfigs (single source of truth).
 * Uses POSIX paths for consistency across platforms.
 */
export function getConfigPaths(agentName: string): string[] {
  const config = detectorConfigs.find((c) => c.name === agentName);
  if (!config || !config.configDir) {
    return [];
  }

  const dir = config.configDir;
  const agentFileName = 'config.json';

  // Standard paths using POSIX for consistency across platforms
  const paths: string[] = [];

  // Unix: ~/.agent/
  paths.push(path.posix.join('~', dir.replace(/^~\//, ''), agentFileName));

  // Windows: %APPDATA%/Agent/
  const windowsDir = dir.charAt(0).toUpperCase() + dir.slice(1);
  paths.push(`%APPDATA%/${windowsDir}/${agentFileName}`);

  return paths;
}

/**
 * Check if a config file exists for the given agent.
 * Derives paths from detectorConfigs (single source of truth).
 * @param agentName - The agent name (key in detectorConfigs)
 * @returns true if any config file exists for the agent
 */
export async function hasConfigFile(agentName: string): Promise<boolean> {
  const paths = getConfigPaths(agentName);
  if (paths.length === 0) {
    return false;
  }

  for (const p of paths) {
    let resolvedPath: string;
    if (p.startsWith('~')) {
      resolvedPath = path.join(os.homedir(), p.slice(1));
    } else if (p.startsWith('%APPDATA%')) {
      const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      resolvedPath = path.join(base, p.slice(9).replace(/^\/+/, ''));
    } else if (p.startsWith('%USERPROFILE%')) {
      const base = process.env.USERPROFILE || os.homedir();
      resolvedPath = path.join(base, p.slice(13).replace(/^\/+/, ''));
    } else {
      resolvedPath = p;
    }

    try {
      await fs.access(resolvedPath);
      return true;
    } catch {
      // File doesn't exist, try next path
    }
  }

  return false;
}
