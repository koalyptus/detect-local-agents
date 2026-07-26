// src/detectors/index.ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { pathToFileURL } from 'node:url';
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

      // v8 ignore: filesystem access cannot be properly mocked with namespace imports in vitest
      /* v8 ignore start */
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
 * Auto-discover file-based detectors by scanning the detectors directory.
 */
async function loadFileBasedDetectors(): Promise<AgentDetector[]> {
  // In Node.js, import.meta.url gives file:///.../src/detectors/index.js
  // We need the directory containing this file
  const moduleUrl = new URL(import.meta.url);
  const detectorsDir = path.dirname(moduleUrl.pathname);

  // On Windows, pathname may start with /C:/... - handle that
  const normalizedDir =
    detectorsDir.startsWith('/') && detectorsDir[2] === ':' ? detectorsDir.slice(1) : detectorsDir;

  const files = (await fs.readdir(normalizedDir)).filter(
    (f) => f.endsWith(DETECTOR_SUFFIX) && f !== 'index.ts',
  );

  const detectors: AgentDetector[] = [];
  for (const file of files) {
    const filePath = path.join(normalizedDir, file);
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
