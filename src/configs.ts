// src/configs.ts
import type { DetectorConfig } from './types.js';

/**
 * Built-in detector configs.
 * Adding a new simple agent = one entry here.
 */
export const detectorConfigs: DetectorConfig[] = [
  {
    name: 'claude',
    binary: 'claude',
    configEnvVars: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'],
    configDir: '~/.claude',
  },
  {
    name: 'codex',
    binary: 'codex',
    configEnvVars: ['OPENAI_API_KEY'],
    configDir: '~/.codex',
  },
  {
    name: 'opencode',
    binary: 'opencode',
    configDir: '~/.config/opencode',
  },
  {
    name: 'goose',
    binary: 'goose',
    configEnvVars: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY'],
  },
  {
    name: 'hermes',
    binary: 'hermes',
    configDir: '~/.hermes',
  },
  {
    name: 'copilot',
    binary: 'copilot',
    // Uses GitHub auth - no simple env var check
  },
  {
    name: 'pi',
    binary: 'pi',
  },
  {
    name: 'aider',
    binary: 'aider',
    configEnvVars: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
  },
  {
    name: 'cline',
    binary: 'cline',
  },
  {
    name: 'gemini',
    binary: 'gemini',
    configEnvVars: ['GOOGLE_API_KEY'],
    configDir: '~/.gemini',
  },
  {
    name: 'antigravity',
    binary: 'agy',
    configEnvVars: ['GOOGLE_API_KEY', 'ANTIGRAVITY_API_KEY'],
  },
  {
    name: 'amp',
    binary: 'amp',
  },
  {
    name: 'roo-code',
    binary: 'roo-code',
  },
  {
    name: 'continue',
    binary: 'continue',
  },
  {
    name: 'tabnine',
    binary: 'tabnine',
  },
];
