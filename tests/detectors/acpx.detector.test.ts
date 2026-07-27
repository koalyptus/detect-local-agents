import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DetectedAgent } from '../../src/types.js';

// Mock modules before importing the detector
const mockWhich = vi.fn();
const mockExecFileAsync = vi.fn();

vi.mock('../../src/detect.js', () => ({
  which: mockWhich,
  getVersion: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

vi.mock('node:util', () => ({
  promisify: () => mockExecFileAsync,
}));

// Import the detector after mocks are set up
let acpxDetector: { name: string; detect: () => Promise<DetectedAgent | null> };

describe('acpx detector', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockWhich.mockResolvedValue('/usr/bin/acpx');
    mockExecFileAsync.mockResolvedValue({ stdout: '', stderr: '' });

    // Import after mocks are set up
    const module = await import('../../src/detectors/acpx.detector.js');
    acpxDetector = module.default;
  });

  afterEach(() => {
    vi.resetAllMocks();
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
    expect(result?.metadata?.targets).toEqual([]);
  });

  it('detects acpx with isConfigured=false when list command returns empty output', async () => {
    mockWhich.mockResolvedValue('/usr/bin/acpx');
    mockExecFileAsync.mockResolvedValue({ stdout: '', stderr: '' });

    const result = await acpxDetector.detect();
    expect(result).not.toBeNull();
    expect(result?.isConfigured).toBe(false);
    expect(result?.metadata?.targets).toEqual([]);
  });
});
