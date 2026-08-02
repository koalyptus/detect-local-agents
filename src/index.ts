// src/index.ts
import type { DetectedAgent } from './types.js';
import { loadAllDetectors } from './detectors/index.js';

export type { DetectedAgent, AgentDetector, DetectorConfig } from './types.js';
export { isAgentDetector } from './detectors/index.js';
export { detectorConfigs } from './config/configs.js';

/**
 * Detect all locally installed AI agents.
 * Returns array of detected agents (empty if none found).
 */
export async function detectAgents(): Promise<DetectedAgent[]> {
  const detectors = await loadAllDetectors();
  const results = await Promise.all(
    detectors.map((detector) => detector.detect().catch(() => null)),
  );
  return results.filter((a): a is DetectedAgent => a !== null);
}
