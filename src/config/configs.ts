import type { DetectorConfig } from '../types.js';

/**
 * Built-in detector configs.
 * Adding a new simple agent = one entry here.
 */
export const detectorConfigs: DetectorConfig[] = [
  {
    name: 'claude_code',
    binary: 'claude',
    configEnvVars: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'],
    configDir: '~/.claude',
    nameResolver: (env) => (env['CLAUDE_CODE_IS_COWORK'] ? 'cowork' : 'claude_code'),
  },
  {
    name: 'codex_cli',
    binary: 'codex',
    configEnvVars: ['OPENAI_API_KEY'],
    configDir: '~/.codex',
  },
  {
    name: 'open_code',
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
    // GitHub Copilot auth is managed by gh CLI or VS Code extension
    configEnvVars: ['GITHUB_TOKEN', 'GH_TOKEN'],
    configDir: '~/.copilot',
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
    configDir: '~/.ollama',
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
    binary: 'stardrop',
  },
  {
    name: 'kimi',
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
