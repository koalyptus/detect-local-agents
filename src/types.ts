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
  id: string; // stable Vercel-aligned key: 'claude_code', 'codex_cli', etc.
  name: string; // legacy display name: 'claude', 'codex', etc. (nameResolver may override)
  binary: string;

  version?: string;
  isConfigured?: boolean;
  configSource?: ConfigSource;
  isACPAgent?: boolean;

  metadata?: Record<string, unknown>;
}

export interface AgentDetector {
  name: string; // stable id (Vercel-aligned)
  detect(options?: DetectOptions): Promise<DetectedAgent | null>;
}

export interface DetectorConfig {
  name: string; // legacy display name
  id?: string; // optional Vercel-aligned id (falls back to name)
  binary: string; // command name to look up in PATH
  versionArgs?: string[]; // args for --version, default ['--version']
  configEnvVars?: string[]; // env vars that indicate the agent is configured
  configDir?: string; // ~/.agent style dir; presence marks it configured
  isACPAgent?: boolean; // true if the agent is ACP-only and needs acpx
  /** Override the detected agent name based on runtime env. */
  nameResolver?: (env: Record<string, string | undefined>) => string;
}

/** Options for programmatic `detectAgents` calls. */
export interface DetectOptions {
  /** Only run detectors whose `id` is in this list. Unknown ids are ignored. */
  only?: string[];
  /** When `false`, skip active binary probes; presence checks (`which`/`access`) still run. Default `true`. */
  probe?: boolean;
  /** Per-probe subprocess cap in ms. Overrides the internal probe timeout (default 5000). */
  timeout?: number;
}
