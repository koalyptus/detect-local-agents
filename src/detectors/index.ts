// src/detectors/index.ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import * as os from 'node:os';
import type { AgentDetector, DetectedAgent, DetectorConfig } from '../types.js';
import { which, getVersion } from '../detect.js';
import { detectorConfigs } from '../configs.js';

const DETECTOR_SUFFIX = '.detector.js';

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

      // v8 ignore: filesystem access cannot be properly mocked with namespace imports in vitest
      /* v8 ignore start */
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
      /* v8 ignore stop */

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
 * Load all detectors: config-based + file-based.
 */
export async function loadAllDetectors(): Promise<AgentDetector[]> {
  const detectors: AgentDetector[] = [];

  // Config-based detectors
  for (const config of detectorConfigs) {
    detectors.push(configToDetector(config));
  }

  // v8 ignore: dynamic import of detector files requires filesystem mocks that
  // don't work with namespace imports (import * as fs). Tests cover detectors directly.
  /* v8 ignore start */
  const dir = fileURLToPath(new URL('.', import.meta.url));
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(DETECTOR_SUFFIX));

  for (const file of files) {
    const filePath = path.join(dir, file);
    const mod = await import(pathToFileURL(filePath).href);
    const detector = mod.default as AgentDetector;
    if (isAgentDetector(detector)) {
      detectors.push(detector);
    }
  }
  /* v8 ignore stop */

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
