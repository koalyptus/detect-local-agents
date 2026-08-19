import type { DetectorConfig } from '../types.js';

/**
 * Built-in detector configs.
 * Adding a new simple agent = one entry here.
 *
 * `id`   = stable Vercel-aligned key (claude_code, codex_cli, open_code). Required.
 * `name` = legacy human-friendly display name (claude, codex, opencode). May be
 *          overridden at runtime by `nameResolver`.
 * When an agent has no Vercel-aligned id, its `id` equals `name`.
 */
export const detectorConfigs: DetectorConfig[] = [
  {
    id: 'claude_code',
    name: 'claude',
    binary: 'claude',
    configEnvVars: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'],
    configDir: '~/.claude',
    nameResolver: (env) => (env['CLAUDE_CODE_IS_COWORK'] ? 'cowork' : 'claude'),
  },
  {
    id: 'codex_cli',
    name: 'codex',
    binary: 'codex',
    configEnvVars: ['OPENAI_API_KEY'],
    configDir: '~/.codex',
  },
  {
    id: 'open_code',
    name: 'opencode',
    binary: 'opencode',
    configDir: '~/.config/opencode',
  },
  {
    id: 'goose',
    name: 'goose',
    binary: 'goose',
    configEnvVars: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY'],
  },
  {
    id: 'hermes',
    name: 'hermes',
    binary: 'hermes',
    configDir: '~/.hermes',
  },
  {
    id: 'github-copilot',
    name: 'github-copilot',
    binary: 'copilot',
    // GitHub Copilot auth is managed by gh CLI or VS Code extension
    configEnvVars: ['GITHUB_TOKEN', 'GH_TOKEN'],
    configDir: '~/.copilot',
  },
  {
    id: 'pi',
    name: 'pi',
    binary: 'pi',
  },
  {
    id: 'aider',
    name: 'aider',
    binary: 'aider',
    configEnvVars: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'AIDER_ANTHROPIC_API_KEY'],
    configDir: '~/.aider',
  },
  {
    id: 'cline',
    name: 'cline',
    binary: 'cline',
  },
  {
    id: 'ollama',
    name: 'ollama',
    binary: 'ollama',
    configDir: '~/.ollama',
  },
  {
    id: 'grok',
    name: 'grok',
    binary: 'grok',
    configEnvVars: ['GROK_API_KEY'],
  },
  {
    id: 'amp',
    name: 'amp',
    binary: 'amp',
  },
  {
    id: 'roo-code',
    name: 'roo-code',
    binary: 'roo-code',
  },
  {
    id: 'continue',
    name: 'continue',
    binary: 'continue',
  },
  {
    id: 'tabnine',
    name: 'tabnine',
    binary: 'stardrop',
  },
  {
    id: 'kimi',
    name: 'kimi',
    binary: 'kimi',
    configDir: '~/.kimi-code',
    configEnvVars: ['KIMI_API_KEY'],
  },
  {
    id: 'kiro',
    name: 'kiro',
    binary: 'kiro',
    configDir: '~/.kiro',
  },
  {
    id: 'mimocode',
    name: 'mimocode',
    binary: 'mimocode',
    configDir: '~/.config/mimocode',
  },
  {
    id: 'openhands',
    name: 'openhands',
    binary: 'openhands',
    configDir: '~/.openhands',
    configEnvVars: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
  },
  {
    id: 'copaw',
    name: 'copaw',
    binary: 'copaw',
    configDir: '~/.copaw',
  },
  {
    id: 'nanobot',
    name: 'nanobot',
    binary: 'nanobot',
    configDir: '~/.nanobot',
  },
  {
    id: 'qwenpaw',
    name: 'qwenpaw',
    binary: 'qwenpaw',
    configEnvVars: ['DASHSCOPE_API_KEY'],
    configDir: '~/.qwenpaw',
  },
  {
    id: 'openclaw',
    name: 'openclaw',
    binary: 'openclaw',
    configDir: '~/.openclaw',
  },
  {
    id: 'qwen-code',
    name: 'qwen-code',
    binary: 'qwen',
    configEnvVars: ['DASHSCOPE_API_KEY'],
  },
  {
    id: 'mercury',
    name: 'mercury',
    binary: 'mercury',
    configDir: '~/.mercury',
  },
];
