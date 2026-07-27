// src/config-paths.ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { detectorConfigs } from './configs.js';

/**
 * Configuration path mapping for an agent.
 */
export interface ConfigPath {
  name: string;
  paths: string[];
}

/**
 * Resolves a path that may contain ~ or %APPDATA% or %USERPROFILE%.
 */
export function resolveConfigPath(p: string): string {
  if (p.startsWith('~')) {
    return path.join(os.homedir(), p.slice(1));
  }
  if (p.startsWith('%APPDATA%')) {
    const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const rest = p.slice(9).replace(/^\/+/, '');
    return path.join(base, rest);
  }
  if (p.startsWith('%USERPROFILE%')) {
    const base = process.env.USERPROFILE || os.homedir();
    const rest = p.slice(13).replace(/^\/+/, '');
    return path.join(base, rest);
  }
  return p;
}

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
  const agentFileName = agentName === 'claude' ? 'settings.json' : 'config.json';

  // Standard paths using POSIX for consistency
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
