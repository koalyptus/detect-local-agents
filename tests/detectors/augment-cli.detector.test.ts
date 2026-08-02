import { describe, it, expect, vi, beforeEach } from 'vitest';
import { which, getVersion } from '../../src/detect/utils.js';
import augmentDetector from '../../src/detectors/augment-cli.detector.js';

vi.mock('../../src/detect/utils.js', () => ({
  which: vi.fn(),
  getVersion: vi.fn(),
}));

const mockWhich = vi.mocked(which);
const mockGetVersion = vi.mocked(getVersion);

describe('augment-cli detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['AUGMENT_AGENT'];
  });

  it('returns null when auggie not found', async () => {
    mockWhich.mockResolvedValue(null);
    expect(await augmentDetector.detect()).toBeNull();
  });

  it('returns agent when auggie found (not configured)', async () => {
    mockWhich.mockResolvedValue('/usr/bin/auggie');
    mockGetVersion.mockResolvedValue('1.0.0');

    const result = await augmentDetector.detect();
    expect(result?.name).toBe('augment-cli');
    expect(result?.binary).toBe('/usr/bin/auggie');
    expect(result?.version).toBe('1.0.0');
    expect(result?.isConfigured).toBe(false);
  });

  it('returns agent with undefined version when getVersion returns null', async () => {
    mockWhich.mockResolvedValue('/usr/bin/auggie');
    mockGetVersion.mockResolvedValue(null);

    const result = await augmentDetector.detect();
    expect(result?.name).toBe('augment-cli');
    expect(result?.version).toBeUndefined();
  });

  it('returns configured when AUGMENT_AGENT is set', async () => {
    mockWhich.mockResolvedValue('/usr/bin/auggie');
    mockGetVersion.mockResolvedValue('1.0.0');
    process.env['AUGMENT_AGENT'] = 'true';

    const result = await augmentDetector.detect();
    expect(result?.isConfigured).toBe(true);
  });
});
