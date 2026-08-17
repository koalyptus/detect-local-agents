import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
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

/**
 * Create a detector from a config entry.
 * Exported for testing.
 */
export function configToDetector(config: DetectorConfig & { id?: string }): AgentDetector {
  const stableId = config.id ?? config.name;

  return {
    name: stableId,

    async detect(options?: DetectOptions): Promise<DetectedAgent | null> {
      return detectImpl(options);
    },
  };

  async function detectImpl(options?: DetectOptions): Promise<DetectedAgent | null> {
    const binary = await which(config.binary);
    if (!binary) {
      return null;
    }

    const version =
      options?.probe === false
        ? undefined
        : ((await getVersion(binary, config.versionArgs, options?.timeout)) ?? undefined);

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
        id: stableId,
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
