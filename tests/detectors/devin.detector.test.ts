import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
}));

import * as fs from 'node:fs/promises';

const mockFsAccess = vi.mocked(fs.access);

import devinDetector from '../../src/detectors/devin.detector.js';

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
  });
});
