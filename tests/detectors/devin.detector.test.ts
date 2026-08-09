import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs/promises';
import devinDetector from '../../src/detectors/devin.detector.js';

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
}));

const mockFsAccess = vi.mocked(fs.access);

describe('devin detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when /opt/.devin does not exist', async () => {
    mockFsAccess.mockRejectedValue(new Error('not found'));
    expect(await devinDetector.detect()).toBeNull();
  });

  it('returns agent when /opt/.devin exists', async () => {
    mockFsAccess.mockResolvedValue(undefined);

    const result = await devinDetector.detect();
    expect(result?.name).toBe('devin');
    expect(result?.binary).toBe('/opt/.devin');
    expect(result?.isConfigured).toBe(true);
    // Deliberate omission: the /opt/.devin marker signals "this machine is a
    // Devin sandbox", not a user-configured agent signal. It is neither the
    // agent's config file nor its config dir, so configSource stays undefined.
    expect(result?.configSource).toBeUndefined();
  });
});
