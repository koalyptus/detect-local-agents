// src/detectors/index.ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import type { AgentDetector, DetectedAgent, DetectorConfig } from '../types.js';
import { which, getVersion } from '../detect.js';
import { detectorConfigs } from '../configs.js';
import { hasConfigFile } from '../config-paths.js';
import acpxDetector from './acpx.detector.js';
import cursorDetector from './cursor.detector.js';
import rovodevDetector from './rovodev.detector.js';
import orcaDetector from './orca.detector.js';
import windsurfDetector from './windsurf.detector.js';
import sweAgentDetector from './swe-agent.detector.js';
import miniCodingAgentDetector from './mini-coding-agent.detector.js';
import openhandsSdkDetector from './openhands-sdk.detector.js';

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
 * Load all detectors: config-based + auto-discovered file-based.
 */
export async function loadAllDetectors(): Promise<AgentDetector[]> {
  const detectors: AgentDetector[] = [];

  // Config-based detectors
  for (const config of detectorConfigs) {
    detectors.push(configToDetector(config));
  }

  // File-based detectors (statically imported)
  if (acpxDetector && typeof acpxDetector.detect === 'function') {
    detectors.push(acpxDetector);
  }
  if (cursorDetector && typeof cursorDetector.detect === 'function') {
    detectors.push(cursorDetector);
  }
  if (rovodevDetector && typeof rovodevDetector.detect === 'function') {
    detectors.push(rovodevDetector);
  }
  if (orcaDetector && typeof orcaDetector.detect === 'function') {
    detectors.push(orcaDetector);
  }
  if (windsurfDetector && typeof windsurfDetector.detect === 'function') {
    detectors.push(windsurfDetector);
  }
  if (sweAgentDetector && typeof sweAgentDetector.detect === 'function') {
    detectors.push(sweAgentDetector);
  }
  if (miniCodingAgentDetector && typeof miniCodingAgentDetector.detect === 'function') {
    detectors.push(miniCodingAgentDetector);
  }
  if (openhandsSdkDetector && typeof openhandsSdkDetector.detect === 'function') {
    detectors.push(openhandsSdkDetector);
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
