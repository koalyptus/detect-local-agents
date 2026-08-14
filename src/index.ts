// src/index.ts
import type { DetectOptions, DetectedAgent } from './types.js';
import { loadAllDetectors } from './detectors/index.js';

export type { DetectedAgent, AgentDetector, DetectorConfig } from './types.js';
export type { DetectOptions } from './types.js';
export { isAgentDetector } from './detectors/index.js';
export { detectorConfigs } from './config/configs.js';

/**
 * Detect all locally installed AI agents.
 * Returns array of detected agents (empty if none found).
 *
 * @param options Optional controls for programmatic/embedded callers:
 *  - `only`: restrict to a set of detector names
 *  - `probe`: when false, skip active binary probes (presence checks still run)
 *  - `timeout`: per-probe subprocess cap in ms
 * Omitting `options` preserves the default behaviour bit-for-bit.
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
