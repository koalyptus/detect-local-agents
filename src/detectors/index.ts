import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { AgentDetector, DetectedAgent, DetectorConfig } from '../types.js';
import { which, getVersion } from '../detect.js';
import { detectorConfigs } from '../configs.js';
import { hasConfigFile } from '../config-paths.js';
import { withTimeout } from '../timeout.js';

/** Per-detector timeout in milliseconds. */
const DETECTOR_TIMEOUT = 10_000;

/**
 * Create a detector from a config entry.
 * Exported for testing.
 */
export function configToDetector(config: DetectorConfig): AgentDetector {
  return {
    name: config.name,

    async detect(): Promise<DetectedAgent | null> {
      return withTimeout(detectImpl(), DETECTOR_TIMEOUT, `detect ${config.name}`);
    },
  };

  async function detectImpl(): Promise<DetectedAgent | null> {
    const binary = await which(config.binary);
    if (!binary) {
      return null;
    }

    const version = (await getVersion(binary, config.versionArgs)) ?? undefined;

    // Check if configured
    let isConfigured = false;

    // Check env vars
    if (config.configEnvVars?.length) {
      isConfigured = config.configEnvVars.some((v) => !!process.env[v]);
    }

    // Check config file on disk
    if (!isConfigured) {
      isConfigured = await hasConfigFile(config.name);
    }

    // Fallback: check config directory
    if (!isConfigured && config.configDir) {
      const dir = config.configDir.startsWith('~')
        ? path.join(process.env.HOME || os.homedir(), config.configDir.slice(1))
        : config.configDir;
      try {
        await fs.access(dir);
        isConfigured = true;
      } catch {
        // No config dir
      }
    }

    return {
      name: config.nameResolver
        ? config.nameResolver(process.env)
        : config.name,
      binary,
      version,
      isConfigured,
      isACPAgent: config.isACPAgent ?? false,
    };
  }
}

/**
 * Load all detectors: config-based + auto-discovered file-based.
 */
export async function loadAllDetectors(): Promise<AgentDetector[]> {
  const detectors: AgentDetector[] = [];

  // Config-based detectors
  for (const config of detectorConfigs) {
    detectors.push(configToDetector(config));
  }

  // File-based detectors: auto-discover *.detector.ts sibling modules
  const __filename = fileURLToPath(import.meta.url);
  const detectorsDir = path.dirname(__filename);
  const files = await fs.readdir(detectorsDir);
  for (const file of files) {
    if (!/\.detector\.[jt]s$/.test(file) || file.startsWith('index.')) {
      continue;
    }
    try {
      const mod = await import(pathToFileURL(path.join(detectorsDir, file)).href);
      const detector = mod.default;
      if (detector && typeof detector.detect === 'function') {
        detectors.push(detector);
      }
    } catch (err) {
      console.warn(`Skipping detector ${file}: ${(err as Error).message}`);
    }
  }

  return detectors;
}

/** Type guard for AgentDetector */
export function isAgentDetector(obj: unknown): obj is AgentDetector {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as AgentDetector).name === 'string' &&
    typeof (obj as AgentDetector).detect === 'function'
  );
}
