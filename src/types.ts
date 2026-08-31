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
  /**
   * Absolute path to the resolved binary (from `which`/`where`).
   * On Windows this includes the extension (e.g. `C:\...\claude.cmd` or `claude.exe`);
   * on POSIX it is extensionless (e.g. `/usr/local/bin/claude`). This is the real
   * on-disk path, not the bare command name from `DetectorConfig.binary`.
   */
  binary: string;

  version?: string;
  isConfigured?: boolean;
  configSource?: ConfigSource;
  isACPAgent?: boolean;

  metadata?: Record<string, unknown>;
}

export interface AgentDetector {
  /** Stable Vercel-aligned id (e.g. 'claude_code'). Must match the produced DetectedAgent.id. */
  id: string;
  detect(options?: DetectOptions): Promise<DetectedAgent | null>;
}

export interface DetectorConfig {
  /** Stable Vercel-aligned id (e.g. 'claude_code'). Required. */
  id: string;
  /** Legacy display name (e.g. 'claude'). Shown in DetedAgent.name; may be overridden by nameResolver. */
  name: string;
  binary: string; // bare command name to look up in PATH (e.g. 'claude'); the resolved absolute path is reported in DetectedAgent.binary
  versionArgs?: string[]; // args for --version, default ['--version']
  configEnvVars?: string[]; // env vars that indicate the agent is configured
  configDir?: string; // ~/.agent style dir; presence marks it configured
  isACPAgent?: boolean; // true if the agent is ACP-only and needs acpx
  /** Override the detected agent name based on runtime env. */
  nameResolver?: (env: Record<string, string | undefined>) => string;
}

/**
 * A supported agent entry. Currently exposes only the stable id used by
 * `detectAgents({ only: [...] })` and the CLI.
 */
export interface SupportedAgent {
  /** Stable Vercel-aligned id (e.g. 'claude_code', 'acpx'). Always present. */
  id: string;
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
