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
});
