// src/index.ts
import type { DetectOptions, DetectedAgent } from './types.js';
import { loadAllDetectors } from './detectors/index.js';

export type { DetectedAgent, AgentDetector, DetectorConfig } from './types.js';
export { isAgentDetector } from './detectors/index.js';
export { detectorConfigs } from './config/configs.js';
export { type DetectOptions };

/**
 * Detect all locally installed AI agents.
 * Returns array of detected agents (empty if none found).
 *
 * NOTE: The file-based detectors (acpx, rovodev) use module-level setters
 * to receive probe/timeout options without changing the AgentDetector.detect()
 * signature. This makes a single detectAgents() call safe, but concurrent
 * top-level calls can interleave those module-level writes. If you need
 * overlapping detectAgents() invocations, refactor detectors to accept
 * options directly instead of relying on module-level state.
 */
export async function detectAgents(options?: DetectOptions): Promise<DetectedAgent[]> {
  const detectors = await loadAllDetectors(options);
  const only = new Set(options?.only ?? []);
  const filtered = only.size === 0 ? detectors : detectors.filter((d) => only.has(d.name));

  const results = await Promise.all(
    filtered.map((detector) => detector.detect().catch(() => null)),
  );
  return results.filter((a): a is DetectedAgent => a !== null);
}
