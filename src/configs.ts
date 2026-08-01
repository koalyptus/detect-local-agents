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
    nameResolver: (env) =>
      env['CLAUDE_CODE_IS_COWORK'] ? 'cowork' : 'claude',
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
    name: 'github-copilot',
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
  },
  {
    name: 'cline',
    binary: 'cline',
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
  {
    name: 'kimi-code',
    binary: 'kimi',
    configDir: '~/.kimi-code',
    configEnvVars: ['KIMI_API_KEY'],
  },
  {
    name: 'kiro',
    binary: 'kiro',
    configDir: '~/.kiro',
  },
  {
    name: 'mimocode',
    binary: 'mimocode',
    configDir: '~/.config/mimocode',
  },
  {
    name: 'openhands',
    binary: 'openhands',
    configDir: '~/.openhands',
    configEnvVars: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
  },
  {
    name: 'copaw',
    binary: 'copaw',
    configDir: '~/.copaw',
  },
  {
    name: 'nanobot',
    binary: 'nanobot',
    configDir: '~/.nanobot',
  },
  {
    name: 'qwenpaw',
    binary: 'qwenpaw',
    configEnvVars: ['DASHSCOPE_API_KEY'],
    configDir: '~/.qwenpaw',
  },
  {
    name: 'openclaw',
    binary: 'openclaw',
    configDir: '~/.openclaw',
  },
  {
    name: 'qwen-code',
    binary: 'qwen',
    configEnvVars: ['DASHSCOPE_API_KEY'],
  },
  {
    name: 'mercury',
    binary: 'mercury',
    configDir: '~/.mercury',
  },
];
