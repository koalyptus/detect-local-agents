// tests/detectors/invariant.test.ts
import { describe, it, expect, vi } from 'vitest';

// Hermetic, exhaustive invariant check. Every binary "exists" (child_process
// mocked so which/getVersion/probes succeed), every fs access check succeeds,
// and every probe command returns output — so every loaded detector reports
// an agent and the invariant is exercised rather than vacuous. Module
// discovery (fs.readdir) and everything else stay real.
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    access: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    execFile: vi.fn(
      (
        _file: string,
        _args: readonly string[],
        _options: unknown,
        callback: (error: Error | null, stdout: string, stderr: string) => void,
      ) => {
        callback(null, '/usr/local/bin/fake\n', '');
      },
    ),
  };
});

vi.mock('../../src/detect/platform.js', () => ({
  getPlatform: vi.fn(() => 'linux'),
}));

import { loadAllDetectors } from '../../src/detectors/index.js';
import { detectAgents } from '../../src/index.js';

describe('configSource invariant', () => {
  it('configSource is only set when isConfigured is true (every loaded detector)', async () => {
    const detectors = await loadAllDetectors();
    expect(detectors.length).toBeGreaterThan(0);

    for (const detector of detectors) {
      const agent = await detector.detect();
      if (agent?.configSource) {
        expect(
          agent.isConfigured,
          `${detector.name}: configSource ${agent.configSource} requires isConfigured`,
        ).toBe(true);
      }
    }
  });

  it('the invariant is exercised, and devin is the documented one-directional converse', async () => {
    const agents = await detectAgents();

    // At least one agent reports a configSource — the assertion above is
    // not vacuous.
    const withSource = agents.filter((a) => a.configSource !== undefined);
    expect(withSource.length).toBeGreaterThan(0);

    // The converse deliberately does not hold: devin reports configured via
    // the /opt/.devin sandbox marker but carries no configSource.
    const configuredWithoutSource = agents.filter((a) => a.isConfigured && !a.configSource);
    expect(configuredWithoutSource.some((a) => a.name === 'devin')).toBe(true);
  });
});
