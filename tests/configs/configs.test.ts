import { describe, it, expect } from 'vitest';
import { detectorConfigs } from '../../src/configs.js';

describe('detectorConfigs', () => {
  it('includes roo-code config entry', () => {
    const rooCodeConfig = detectorConfigs.find((c) => c.name === 'roo-code');
    expect(rooCodeConfig).toBeDefined();
    expect(rooCodeConfig?.binary).toBe('roo-code');
  });

  it('includes continue config entry', () => {
    const continueConfig = detectorConfigs.find((c) => c.name === 'continue');
    expect(continueConfig).toBeDefined();
    expect(continueConfig?.binary).toBe('continue');
  });

  it('includes tabnine config entry', () => {
    const tabnineConfig = detectorConfigs.find((c) => c.name === 'tabnine');
    expect(tabnineConfig).toBeDefined();
    expect(tabnineConfig?.binary).toBe('tabnine');
  });

  it('includes antigravity config entry', () => {
    const antigravityConfig = detectorConfigs.find((c) => c.name === 'antigravity');
    expect(antigravityConfig).toBeDefined();
    expect(antigravityConfig?.binary).toBe('agy');
    expect(antigravityConfig?.configEnvVars).toContain('GOOGLE_API_KEY');
  });

  it('includes ollama config entry', () => {
    const ollamaConfig = detectorConfigs.find((c) => c.name === 'ollama');
    expect(ollamaConfig).toBeDefined();
    expect(ollamaConfig?.binary).toBe('ollama');
  });

  it('includes grok config entry', () => {
    const grokConfig = detectorConfigs.find((c) => c.name === 'grok');
    expect(grokConfig).toBeDefined();
    expect(grokConfig?.binary).toBe('grok');
    expect(grokConfig?.configEnvVars).toContain('GROK_API_KEY');
  });

  describe('Phase 4: new config entries', () => {
    const newAgents = [
      { name: 'devin', binary: 'devin' },
      { name: 'kimi-code', binary: 'kimi' },
      { name: 'kiro', binary: 'kiro' },
      { name: 'mimocode', binary: 'mimocode' },
      { name: 'openclacky', binary: 'openclacky' },
      { name: 'openhands', binary: 'openhands' },
      { name: 'open-swe', binary: 'open-swe' },
      { name: 'proliferate', binary: 'proliferate' },
      { name: 'qwen-code', binary: 'qwen' },
      { name: 'copaw', binary: 'copaw' },
      { name: 'mercury', binary: 'mercury' },
      { name: 'nanobot', binary: 'nanobot' },
      { name: 'openhuman', binary: 'openhuman' },
      { name: 'openclaw', binary: 'openclaw' },
      { name: 'qwenpaw', binary: 'qwenpaw' },
      { name: 'trustclaw', binary: 'trustclaw' },
    ];

    for (const agent of newAgents) {
      it(`includes ${agent.name} config entry with binary ${agent.binary}`, () => {
        const config = detectorConfigs.find((c) => c.name === agent.name);
        expect(config).toBeDefined();
        expect(config?.binary).toBe(agent.binary);
      });
    }
  });

  it('kimi-code has configDir and KIMI_API_KEY', () => {
    const config = detectorConfigs.find((c) => c.name === 'kimi-code');
    expect(config?.configDir).toBe('~/.kimi-code');
    expect(config?.configEnvVars).toContain('KIMI_API_KEY');
  });

  it('aider has enriched config', () => {
    const config = detectorConfigs.find((c) => c.name === 'aider');
    expect(config?.configDir).toBe('~/.aider');
    expect(config?.configEnvVars).toContain('AIDER_ANTHROPIC_API_KEY');
    expect(config?.versionArgs).toEqual(['--version']);
  });
});
