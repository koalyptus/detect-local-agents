// src/detectors/index.ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fsSync from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import type { AgentDetector, DetectedAgent, DetectorConfig } from '../types.js';
import { which, getVersion } from '../detect.js';
import { detectorConfigs } from '../configs.js';
import { hasConfigFile } from '../config-paths.js';

const DETECTOR_SUFFIX = '.detector.ts';

/**
 * Create a detector from a config entry.
 */
function configToDetector(config: DetectorConfig): AgentDetector {
  return {
    name: config.name,

    async detect(): Promise<DetectedAgent | null> {
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

      // Fallback: check config directory (backward compat)
      if (!isConfigured && config.configDir) {
        const dir = config.configDir.startsWith('~')
          ? path.join(os.homedir(), config.configDir.slice(1))
          : config.configDir;
        try {
          await fs.access(dir);
          isConfigured = true;
        } catch {
          // No config dir
        }
      }

      return {
        name: config.name,
        binary,
        version,
        isConfigured,
        isACPAgent: config.isACPAgent ?? false,
      };
    },
  };
}
/**
 * Auto-discover file-based detectors by scanning the detectors directory.
 */
async function loadFileBasedDetectors(): Promise<AgentDetector[]> {
  const detectorsDir = path.dirname(fileURLToPath(import.meta.url));

  const files = fsSync
    .readdirSync(detectorsDir)
    .filter((f) => f.endsWith(DETECTOR_SUFFIX) && f !== 'index.ts');

  const detectors: AgentDetector[] = [];
  for (const file of files) {
    const filePath = path.join(detectorsDir, file);
    const mod = await import(pathToFileURL(filePath).href);
    const detector = mod.default as AgentDetector;
    if (detector && typeof detector.detect === 'function') {
      detectors.push(detector);
    }
  }
  return detectors;
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

  // File-based detectors (auto-discovered)
  detectors.push(...(await loadFileBasedDetectors()));

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
