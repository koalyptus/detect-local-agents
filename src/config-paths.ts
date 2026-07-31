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

  // Windows: %APPDATA%/.agent/
  // Strip leading ~/ from dir (POSIX home-relative path) to get the actual dir name,
  // then build a Windows %APPDATA% path. The dir name stays lowercase to match
  // the convention used by most tools on Windows.
  const dirName = dir.replace(/^~\//, '');
  paths.push(`%APPDATA%/${dirName}/${agentFileName}`);

  // Windows: %USERPROFILE%/.agent/ (some tools use USERPROFILE)
  paths.push(`%USERPROFILE%/${dirName}/${agentFileName}`);

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
    let resolvedPath = p;
    if (p.startsWith('~')) {
      resolvedPath = path.join(process.env.HOME || os.homedir(), p.slice(1));
    } else if (p.startsWith('%APPDATA%')) {
      const base =
        process.env.APPDATA || path.join(process.env.HOME || os.homedir(), 'AppData', 'Roaming');
      resolvedPath = path.join(base, p.replace('%APPDATA%', '').replace(/^\/+/, ''));
    } else if (p.startsWith('%USERPROFILE%')) {
      // The ~ branch checks HOME/.claude first; on POSIX this
      // sub-branch (HOME unset -> os.homedir()) is unreachable because ~ would
      // have already resolved to the same path. On Windows where ~ paths may
      // not exist, this fallback is valid but untestable here.
      /* v8 ignore next */
      const base = process.env.USERPROFILE || process.env.HOME || os.homedir();
      resolvedPath = path.join(base, p.replace('%USERPROFILE%', '').replace(/^\/+/, ''));
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
