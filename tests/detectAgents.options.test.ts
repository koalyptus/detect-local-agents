import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the detector loader so we exercise detectAgents' option handling
// (only / probe / timeout) without spawning real binaries.
const { mockLoadAllDetectors } = vi.hoisted(() => ({
  mockLoadAllDetectors: vi.fn(),
}));
vi.mock('../src/detectors/index.js', () => ({
  loadAllDetectors: mockLoadAllDetectors,
  isAgentDetector: vi.fn(() => true),
}));

import { detectAgents } from '../src/index.js';
import type { DetectedAgent } from '../src/types.js';

const makeDetector = (name: string) => {
  const detect = vi.fn(
    async () => ({ id: name, name, binary: `/usr/bin/${name}` }) as DetectedAgent,
  );
  return { id: name, name, detect };
};

describe('detectAgents(options)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs every detector when called with no options', async () => {
    const a = makeDetector('a');
    const b = makeDetector('b');
    mockLoadAllDetectors.mockResolvedValue([a, b]);

    const result = await detectAgents();
    expect(result.map((r) => r.name).sort()).toEqual(['a', 'b']);
    expect(a.detect).toHaveBeenCalledTimes(1);
    expect(b.detect).toHaveBeenCalledTimes(1);
    // default path: detect called with `undefined` (backward-compatible)
    expect(a.detect).toHaveBeenCalledWith(undefined);
  });

  it('only: [] (empty) still runs every detector', async () => {
    const a = makeDetector('a');
    const b = makeDetector('b');
    mockLoadAllDetectors.mockResolvedValue([a, b]);

    await detectAgents({ only: [] });
    expect(a.detect).toHaveBeenCalledTimes(1);
    expect(b.detect).toHaveBeenCalledTimes(1);
  });

  it('only: restricts to named detectors and skips the rest', async () => {
    const a = makeDetector('a');
    const b = makeDetector('b');
    mockLoadAllDetectors.mockResolvedValue([a, b]);

    const result = await detectAgents({ only: ['a'] });
    expect(result.map((r) => r.name)).toEqual(['a']);
    expect(a.detect).toHaveBeenCalledTimes(1);
    expect(b.detect).not.toHaveBeenCalled();
  });

  it('only: unknown names are ignored (no crash, empty result)', async () => {
    const a = makeDetector('a');
    mockLoadAllDetectors.mockResolvedValue([a]);

    const result = await detectAgents({ only: ['ghost'] });
    expect(result).toEqual([]);
    expect(a.detect).not.toHaveBeenCalled();
  });

  it('threads probe/timeout options into each detector.detect call', async () => {
    const a = makeDetector('a');
    mockLoadAllDetectors.mockResolvedValue([a]);

    await detectAgents({ probe: false, timeout: 1234 });
    expect(a.detect).toHaveBeenCalledWith({ probe: false, timeout: 1234 });
  });
});
