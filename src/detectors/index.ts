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
import { setAcpxDetectorOptions } from './acpx.detector.js';
import { setRovodevDetectorOptions } from './rovodev.detector.js';

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

/** Load all detectors: config-based + auto-discovered file-based. */
export async function loadAllDetectors(options?: DetectOptions): Promise<AgentDetector[]> {
  const detectors: AgentDetector[] = [];

  // Config-based detectors
  for (const config of detectorConfigs) {
    detectors.push(configToDetector(config, options));
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
        // File-based detectors currently don't take options directly.
        // acpx/rovodev use module-level setters as the least invasive path.
        if (detector.name === 'acpx' && options) {
          setAcpxDetectorOptions(options.probe, options.timeout);
        } else if (detector.name === 'rovodev' && options) {
          setRovodevDetectorOptions(options.probe, options.timeout);
        }
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
