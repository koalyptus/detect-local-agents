import type { DetectOptions, DetectedAgent, SupportedAgent } from './types.js';
import { loadAllDetectors } from './detectors/index.js';

export type {
  DetectedAgent,
  AgentDetector,
  DetectorConfig,
  DetectOptions,
  SupportedAgent,
} from './types.js';
export { isAgentDetector } from './detectors/index.js';
export { detectorConfigs } from './config/configs.js';

/**
 * Enumerate all agent ids this package can detect, without probing the local
 * machine. Includes both config-based detectors and file-based detector
 * modules. Adding a new detector automatically appears here.
 *
 * For the runtime display name (which can differ from the static id, e.g.
 * `claude_code` ↔ `cowork` via `nameResolver`), call `detectAgents()` and
 * read `.name` on each result.
 *
 * @returns {Promise<SupportedAgent[]>} The supported agents, sorted by `id`.
 *          Sorting makes the output deterministic across platforms: the
 *          underlying detector order depends on `fs.readdir`, which POSIX does
 *          not guarantee.
 */
export async function listSupportedAgents(): Promise<SupportedAgent[]> {
  const detectors = await loadAllDetectors();
  return detectors.map((d) => ({ id: d.id })).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Detect all locally installed AI agents.
 *
 * @param options DetectOptions for programmatic/embedded callers:
 *   - `only?: string[]` — restrict detection to the named detector ids (matched
 *     against each `AgentDetector.id`). Unknown ids are ignored, not errors.
 *   - `probe?: boolean` — when `false`, skip active binary probes but still run
 *     presence checks (`which`/`access`). Defaults to `true`.
 *   - `timeout?: number` — per-probe subprocess cap in milliseconds, applied to
 *     `getVersion` and each detector's probe. Defaults to `VERSION_PROBE_TIMEOUT`.
 * @returns The detected agents, or an empty array when none are found.
 *          Omitting `options` preserves the default behaviour bit-for-bit.
 */
export async function detectAgents(options?: DetectOptions): Promise<DetectedAgent[]> {
  const detectors = await loadAllDetectors();
  const only = new Set(options?.only ?? []);
  const filtered = only.size === 0 ? detectors : detectors.filter((d) => only.has(d.id));

  const results = await Promise.all(
    filtered.map((detector) => detector.detect(options).catch(() => null)),
  );
  return results.filter((a): a is DetectedAgent => a !== null);
}
