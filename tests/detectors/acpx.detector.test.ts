import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import acpxDetector, { setAcpxDetectorOptions } from '../../src/detectors/acpx.detector.js';

// vi.mock factories are hoisted to the top of the file, so they cannot
// reference any top-level variables. Use vi.hoisted to create shared mocks.
const { mockWhich, mockExecFileAsync } = vi.hoisted(() => ({
  mockWhich: vi.fn(),
  mockExecFileAsync: vi.fn(),
}));

vi.mock('../../src/detect/utils.js', () => ({
  which: mockWhich,
  getVersion: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

vi.mock('node:util', () => ({
  promisify: () => mockExecFileAsync,
}));

describe('acpx detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhich.mockResolvedValue('/usr/bin/acpx');
    mockExecFileAsync.mockResolvedValue({ stdout: '', stderr: '' });
    setAcpxDetectorOptions(undefined, undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
    setAcpxDetectorOptions(undefined, undefined);
  });

  it('returns null when acpx binary not found', async () => {
    mockWhich.mockResolvedValue(null);

    const result = await acpxDetector.detect();
    expect(result).toBeNull();
  });

  it('detects acpx with targets from `acpx list` command', async () => {
    mockWhich.mockResolvedValue('/usr/bin/acpx');
    mockExecFileAsync.mockResolvedValue({ stdout: 'target1\ntarget2\ntarget3\n', stderr: '' });

    const result = await acpxDetector.detect();
    expect(result).not.toBeNull();
    expect(result?.name).toBe('acpx');
    expect(result?.binary).toBe('/usr/bin/acpx');
    expect(result?.isACPAgent).toBe(true);
    expect(result?.isConfigured).toBe(true);
    expect(result?.configSource).toBe('probe');
    expect(result?.metadata?.targets).toEqual(['target1', 'target2', 'target3']);
  });

  it('detects acpx with isConfigured=false when list command fails', async () => {
    mockWhich.mockResolvedValue('/usr/bin/acpx');
    mockExecFileAsync.mockRejectedValue(new Error('Command failed'));

    const result = await acpxDetector.detect();
    expect(result).not.toBeNull();
    expect(result?.name).toBe('acpx');
    expect(result?.binary).toBe('/usr/bin/acpx');
    expect(result?.isACPAgent).toBe(true);
    expect(result?.isConfigured).toBe(false);
    expect(result?.configSource).toBeUndefined();
    expect(result?.metadata?.targets).toEqual([]);
  });

  it('detects acpx with isConfigured=false when list command returns empty output', async () => {
    mockWhich.mockResolvedValue('/usr/bin/acpx');
    mockExecFileAsync.mockResolvedValue({ stdout: '', stderr: '' });

    const result = await acpxDetector.detect();
    expect(result).not.toBeNull();
    expect(result?.isConfigured).toBe(false);
    expect(result?.configSource).toBeUndefined();
    expect(result?.metadata?.targets).toEqual([]);
  });

  it('skips probe and returns isConfigured=undefined when probe is false', async () => {
    mockWhich.mockResolvedValue('/usr/bin/acpx');
    setAcpxDetectorOptions(false, undefined);

    const result = await acpxDetector.detect();
    expect(result).not.toBeNull();
    expect(result?.name).toBe('acpx');
    expect(result?.binary).toBe('/usr/bin/acpx');
    expect(result?.isConfigured).toBeUndefined();
    expect(result?.configSource).toBeUndefined();
    expect(mockExecFileAsync).not.toHaveBeenCalled();
  });
});
