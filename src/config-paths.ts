import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { detectorConfigs } from './configs.js';

/** Strips leading forward slashes from a path segment. */
const LEADING_SLASHES = /^\/+/;

/**
 * Resolve a POSIX-style home-relative path (`~/.agent/config.json`) or
 * Windows-style variable path (`%APPDATA%/.agent/config.json`) to an
 * absolute path using the current environment.
 */
function resolveConfigPath(candidatePath: string): string {
  if (candidatePath.startsWith('~')) {
    return path.join(process.env.HOME || os.homedir(), candidatePath.slice(1));
  }
  if (candidatePath.startsWith('%APPDATA%')) {
    const base =
      process.env.APPDATA || path.join(process.env.HOME || os.homedir(), 'AppData', 'Roaming');
    return path.join(base, candidatePath.replace('%APPDATA%', '').replace(LEADING_SLASHES, ''));
  }
  if (candidatePath.startsWith('%USERPROFILE%')) {
    /* v8 ignore next */
    const base = process.env.USERPROFILE || process.env.HOME || os.homedir();
    return path.join(base, candidatePath.replace('%USERPROFILE%', '').replace(LEADING_SLASHES, ''));
  }
  return candidatePath;
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
  return (await findAgentConfigPath(agentName)) !== null;
}

/**
 * Find the first existing config file path for an agent.
 * Returns the path or null if none found.
 * Shares resolution logic with hasConfigFile.
 */
export async function findAgentConfigPath(agentName: string): Promise<string | null> {
  const paths = getConfigPaths(agentName);
  if (paths.length === 0) {
    return null;
  }

  for (const candidatePath of paths) {
    const resolvedPath = resolveConfigPath(candidatePath);

    try {
      await fs.access(resolvedPath);
      return resolvedPath;
    } catch {
      // File doesn't exist, try next path
    }
  }

  return null;
}

/**
 * Safely read and parse an agent's config file.
 * Returns the parsed JSON object, or null if the file doesn't exist
 * or contains malformed JSON.
 */
export async function readAgentConfig(agentName: string): Promise<Record<string, unknown> | null> {
  const configPath = await findAgentConfigPath(agentName);
  if (!configPath) {
    return null;
  }

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}
