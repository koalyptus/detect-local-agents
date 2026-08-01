import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/detect.js', () => ({
  which: vi.fn(),
  getVersion: vi.fn(),
}));

import { which, getVersion } from '../../src/detect.js';

const mockWhich = vi.mocked(which);
const mockGetVersion = vi.mocked(getVersion);

import junieDetector from '../../src/detectors/junie.detector.js';

describe('junie detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['JUNIE_DATA'];
    delete process.env['JUNIE_SHIM_PATH'];
  });

  it('returns null when junie not found', async () => {
    mockWhich.mockResolvedValue(null);
    expect(await junieDetector.detect()).toBeNull();
  });

  it('returns agent when junie found (not configured)', async () => {
    mockWhich.mockResolvedValue('/usr/bin/junie');
    mockGetVersion.mockResolvedValue('1.0.0');

    const result = await junieDetector.detect();
    expect(result?.name).toBe('junie');
    expect(result?.binary).toBe('/usr/bin/junie');
    expect(result?.version).toBe('1.0.0');
    expect(result?.isConfigured).toBe(false);
  });

  it('returns agent with undefined version when getVersion returns null', async () => {
    mockWhich.mockResolvedValue('/usr/bin/junie');
    mockGetVersion.mockResolvedValue(null);

    const result = await junieDetector.detect();
    expect(result?.name).toBe('junie');
    expect(result?.version).toBeUndefined();
  });

  it('returns configured when JUNIE_DATA is set', async () => {
    mockWhich.mockResolvedValue('/usr/bin/junie');
    mockGetVersion.mockResolvedValue('1.0.0');
    process.env['JUNIE_DATA'] = '/some/path';

    const result = await junieDetector.detect();
    expect(result?.isConfigured).toBe(true);
  });

  it('returns configured when JUNIE_SHIM_PATH is set', async () => {
    mockWhich.mockResolvedValue('/usr/bin/junie');
    mockGetVersion.mockResolvedValue('1.0.0');
    process.env['JUNIE_SHIM_PATH'] = '/some/path';

    const result = await junieDetector.detect();
    expect(result?.isConfigured).toBe(true);
  });
});
