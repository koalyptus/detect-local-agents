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
      { name: 'kimi-code', binary: 'kimi' },
      { name: 'kiro', binary: 'kiro' },
      { name: 'mimocode', binary: 'mimocode' },
      { name: 'openhands', binary: 'openhands' },
      { name: 'copaw', binary: 'copaw' },
      { name: 'nanobot', binary: 'nanobot' },
      { name: 'qwenpaw', binary: 'qwenpaw' },
      { name: 'openclaw', binary: 'openclaw' },
      { name: 'qwen-code', binary: 'qwen' },
      { name: 'mercury', binary: 'mercury' },
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

  it('openclaw has configDir', () => {
    const config = detectorConfigs.find((c) => c.name === 'openclaw');
    expect(config?.configDir).toBe('~/.openclaw');
    expect(config?.binary).toBe('openclaw');
  });

  it('aider has enriched config', () => {
    const config = detectorConfigs.find((c) => c.name === 'aider');
    expect(config?.configDir).toBe('~/.aider');
    expect(config?.configEnvVars).toContain('AIDER_ANTHROPIC_API_KEY');
  });

  describe('Phase 6: Vercel integration', () => {
    it('claude config has nameResolver for cowork mode', () => {
      const config = detectorConfigs.find((c) => c.name === 'claude');
      expect(config?.nameResolver).toBeDefined();
    });

    it('claude nameResolver returns cowork when CLAUDE_CODE_IS_COWORK is set', () => {
      const config = detectorConfigs.find((c) => c.name === 'claude');
      const name = config?.nameResolver?.({ CLAUDE_CODE_IS_COWORK: 'true' });
      expect(name).toBe('cowork');
    });

    it('claude nameResolver returns claude when CLAUDE_CODE_IS_COWORK is not set', () => {
      const config = detectorConfigs.find((c) => c.name === 'claude');
      const name = config?.nameResolver?.({});
      expect(name).toBe('claude');
    });

    it('github-copilot replaces copilot', () => {
      const config = detectorConfigs.find((c) => c.name === 'github-copilot');
      expect(config).toBeDefined();
      expect(config?.binary).toBe('copilot');
      expect(detectorConfigs.find((c) => c.name === 'copilot')).toBeUndefined();
    });
  });
});
