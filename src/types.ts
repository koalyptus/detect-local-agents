// src/types.ts

/**
 * Which signal proved an agent was configured.
 * - 'env': a named environment variable was set (strong — user supplied credentials)
 * - 'config-file': a real config file exists on disk (good)
 * - 'config-dir': a config/user-data directory exists (weak — created by a first run,
 *   even an aborted one)
 * - 'probe': we executed the binary and its output proved configuration (strong)
 *
 * Invariant: if `configSource` is set, `isConfigured` is `true` (one-directional —
 * the converse does not hold).
 */
export type ConfigSource = 'env' | 'config-file' | 'config-dir' | 'probe';

export interface DetectedAgent {
  name: string;
  binary: string;

  version?: string;
  isConfigured?: boolean;
  configSource?: ConfigSource;
  isACPAgent?: boolean;

  metadata?: Record<string, unknown>;
}

export interface AgentDetector {
  name: string;
  detect(): Promise<DetectedAgent | null>;
}

export interface DetectorConfig {
  name: string;
  binary: string;
  versionArgs?: string[];
  configEnvVars?: string[];
  configDir?: string;
  isACPAgent?: boolean;
  /** Override the detected agent name based on runtime env. */
  nameResolver?: (env: Record<string, string | undefined>) => string;
}

/** Options for programmatic `detectAgents` calls. */
export interface DetectOptions {
  /** Only run detectors whose `name` is in this list. Unknown names are ignored. */
  only?: string[];
  /**
   * When false, detectors skip active binary probes.
   * Presence checks (`which`/`access`) still run; passive signals are unaffected.
   */
  probe?: boolean;
  /** Cap for any single probe/subprocess, in milliseconds. Overrides the internal default. */
  timeout?: number;
}
