import * as path from 'node:path';
import * as os from 'node:os';
import type {
  AgentDetector,
  ConfigSource,
  DetectedAgent,
  DetectorConfig,
  DetectOptions,
} from '../types.js';
import { which, getVersion, configSourceFromDir, withConfigSource } from '../detect/utils.js';
import { detectorConfigs } from '../config/configs.js';
import { hasConfigFile } from '../config/config-paths.js';
import { createAcpxDetector } from './acpx.detector.js';
import { createRovodevDetector } from './rovodev.detector.js';
// Explicit imports for all file-based detectors (auto-discovery via dynamic import is unreliable in test environments)
import augmentCliDetector from './augment-cli.detector.js';
import cursorDetector from './cursor.detector.js';
import devinDetector from './devin.detector.js';
import geminiDetector from './gemini.detector.js';
import junieDetector from './junie.detector.js';
import lmstudioDetector from './lmstudio.detector.js';
import miniCodingAgentDetector from './mini-coding-agent.detector.js';
import openhandsSdkDetector from './openhands-sdk.detector.js';
import orcaDetector from './orca.detector.js';
import replitDetector from './replit.detector.js';
import sweAgentDetector from './swe-agent.detector.js';
import t3CodeDetector from './t3-code.detector.js';
import windsurfDetector from './windsurf.detector.js';

/** Create a detector from a config entry.
 * Exported for testing.
 */
export function configToDetector(config: DetectorConfig, options?: DetectOptions): AgentDetector {
  return {
    name: config.name,

    async detect(): Promise<DetectedAgent | null> {
      return detectImpl();
    },
  };

  async function detectImpl(): Promise<DetectedAgent | null> {
    const binary = await which(config.binary);
    if (!binary) {
      return null;
    }

    const timeout = options?.timeout;
    const version =
      options?.probe === false
        ? undefined
        : ((await getVersion(binary, config.versionArgs, timeout)) ?? undefined);

    // Check if configured. The first matching signal wins; configSource records
    // which signal it was. The cascade order and short-circuiting are unchanged.
    let configSource: ConfigSource | undefined;

    // Check env vars
    if (config.configEnvVars?.length) {
      if (config.configEnvVars.some((v) => !!process.env[v])) {
        configSource = 'env';
      }
    }

    // Check config file on disk
    if (!configSource) {
      if (await hasConfigFile(config.name)) {
        configSource = 'config-file';
      }
    }

    // Fallback: check config directory
    if (!configSource && config.configDir) {
      const dir = config.configDir.startsWith('~')
        ? path.join(process.env.HOME || os.homedir(), config.configDir.slice(1))
        : config.configDir;
      configSource = await configSourceFromDir(dir);
    }

    return withConfigSource(
      {
        name: config.nameResolver ? config.nameResolver(process.env) : config.name,
        binary,
        version,
        isConfigured: configSource !== undefined,
        isACPAgent: config.isACPAgent ?? false,
      },
      configSource,
    );
  }
}

/** Load all detectors: config-based + explicitly imported file-based. */
export async function loadAllDetectors(options?: DetectOptions): Promise<AgentDetector[]> {
  const detectors: AgentDetector[] = [];

  // Config-based detectors
  for (const config of detectorConfigs) {
    detectors.push(configToDetector(config, options));
  }

  // File-based detectors with options support
  if (options) {
    detectors.push(createAcpxDetector(options));
    detectors.push(createRovodevDetector(options));
  } else {
    // Default options (probe: true, default timeout)
    detectors.push(createAcpxDetector());
    detectors.push(createRovodevDetector());
  }

  // File-based detectors without options support (static objects)
  detectors.push(
    augmentCliDetector,
    cursorDetector,
    devinDetector,
    geminiDetector,
    junieDetector,
    lmstudioDetector,
    miniCodingAgentDetector,
    openhandsSdkDetector,
    orcaDetector,
    replitDetector,
    sweAgentDetector,
    t3CodeDetector,
    windsurfDetector,
  );

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
