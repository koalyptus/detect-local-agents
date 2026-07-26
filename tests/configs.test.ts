import { describe, it, expect } from 'vitest';
import { detectorConfigs } from '../src/configs.js';

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
});
