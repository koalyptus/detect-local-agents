// src/types.ts

export interface DetectedAgent {
  name: string;
  binary: string;

  version?: string;
  isConfigured?: boolean;
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
