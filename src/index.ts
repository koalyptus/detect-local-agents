import type { DetectOptions, DetectedAgent } from './types.js';
import { loadAllDetectors } from './detectors/index.js';

export type { DetectedAgent, AgentDetector, DetectorConfig, DetectOptions } from './types.js';
export { isAgentDetector } from './detectors/index.js';
export { detectorConfigs } from './config/configs.js';

/**
 * Detect all locally installed AI agents.
 *
 * @param options Optional controls for programmatic/embedded callers:
 *   - `only?: string[]` — restrict detection to the named detectors (matched
 *     against each `AgentDetector.name`). Unknown names are ignored, not errors.
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
  const filtered = only.size === 0 ? detectors : detectors.filter((d) => only.has(d.name));

  const results = await Promise.all(
    filtered.map((detector) => detector.detect(options).catch(() => null)),
  );
  return results.filter((a): a is DetectedAgent => a !== null);
}
