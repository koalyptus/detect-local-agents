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
    configEnvVars: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'AIDER_ANTHROPIC_API_KEY'],
    configDir: '~/.aider',
    versionArgs: ['--version'],
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
    name: 'ollama',
    binary: 'ollama',
  },
  {
    name: 'grok',
    binary: 'grok',
    configEnvVars: ['GROK_API_KEY'],
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
  // ── Phase 4: New agents ──────────────────────────────────────
  // Coding agents — terminal / desktop
  {
    name: 'devin',
    binary: 'devin',
    // Cloud/web-based — may not have a local binary; included for completeness.
  },
  {
    name: 'kimi-code',
    binary: 'kimi',
    configDir: '~/.kimi-code',
    configEnvVars: ['KIMI_API_KEY'],
  },
  {
    name: 'kiro',
    binary: 'kiro',
    // ⚠️ needs doc verification: binary name, config paths
  },
  {
    name: 'mimocode',
    binary: 'mimocode',
    // ⚠️ Fork of OpenCode — binary name may differ
  },
  {
    name: 'openclacky',
    binary: 'openclacky',
  },
  {
    name: 'openhands',
    binary: 'openhands',
    configDir: '~/.openhands',
    configEnvVars: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
  },
  {
    name: 'open-swe',
    binary: 'open-swe',
    // ⚠️ needs doc verification: binary may differ
  },
  {
    name: 'proliferate',
    binary: 'proliferate',
    // ⚠️ needs doc verification
  },
  {
    name: 'qwen-code',
    binary: 'qwen',
    configEnvVars: ['DASHSCOPE_API_KEY'],
  },
  // Personal AI agents
  {
    name: 'copaw',
    binary: 'copaw',
    configDir: '~/.copaw',
  },
  {
    name: 'mercury',
    binary: 'mercury',
    configDir: '~/.mercury',
  },
  {
    name: 'nanobot',
    binary: 'nanobot',
    configDir: '~/.nanobot',
  },
  {
    name: 'openhuman',
    binary: 'openhuman',
    configDir: '~/.openhuman',
  },
  {
    name: 'openclaw',
    binary: 'openclaw',
    configDir: '~/.openclaw',
  },
  {
    name: 'qwenpaw',
    binary: 'qwenpaw',
    configEnvVars: ['DASHSCOPE_API_KEY'],
    configDir: '~/.qwenpaw',
  },
  {
    name: 'trustclaw',
    binary: 'trustclaw',
    configDir: '~/.trustclaw',
  },
];
