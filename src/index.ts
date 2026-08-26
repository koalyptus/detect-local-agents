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
 * modules. Backed by `loadAllDetectors()` — adding a new detector
 * automatically appears here, no second registry to keep in sync.
 *
 * For the runtime display name (which can differ from the static id, e.g.
 * `claude_code` ↔ `cowork` via `nameResolver`), call `detectAgents()` and
 * read `.name` on each result.
 *
 * Cost: same as `detectAgents()`'s first call — all detector modules are
 * dynamically imported. No binary probes or filesystem scans run.
 *
 * @returns Deduped, order-stable list (config-based detectors first, then
 *          file-based in directory-read order). Duplicate ids are removed
 *          defensively even though current detectors don't collide.
 */
export async function listSupportedAgents(): Promise<SupportedAgent[]> {
  const detectors = await loadAllDetectors();
  const seen = new Set<string>();
  const result: SupportedAgent[] = [];
  for (const d of detectors) {
    if (!seen.has(d.id)) {
      seen.add(d.id);
      result.push({ id: d.id });
    }
  }
  return result;
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
