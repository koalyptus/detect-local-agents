import { describe, it, expect, vi, beforeEach } from 'vitest';
import { which, getVersion } from '../../src/detect/utils.js';
import replitDetector from '../../src/detectors/replit.detector.js';

vi.mock('../../src/detect/utils.js', () => ({
  which: vi.fn(),
  getVersion: vi.fn(),
}));

const mockWhich = vi.mocked(which);
const mockGetVersion = vi.mocked(getVersion);

describe('replit detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['REPL_ID'];
  });

  it('returns null when replit not found', async () => {
    mockWhich.mockResolvedValue(null);
    expect(await replitDetector.detect()).toBeNull();
  });

  it('returns agent when replit found (not configured)', async () => {
    mockWhich.mockResolvedValue('/usr/bin/replit');
    mockGetVersion.mockResolvedValue('0.3.1');

    const result = await replitDetector.detect();
    expect(result?.name).toBe('replit');
    expect(result?.binary).toBe('/usr/bin/replit');
    expect(result?.version).toBe('0.3.1');
    expect(result?.isConfigured).toBe(false);
  });

  it('returns agent with undefined version when getVersion returns null', async () => {
    mockWhich.mockResolvedValue('/usr/bin/replit');
    mockGetVersion.mockResolvedValue(null);

    const result = await replitDetector.detect();
    expect(result?.name).toBe('replit');
    expect(result?.version).toBeUndefined();
  });

  it('returns configured when REPL_ID is set', async () => {
    mockWhich.mockResolvedValue('/usr/bin/replit');
    mockGetVersion.mockResolvedValue('0.3.1');
    process.env['REPL_ID'] = 'abc-123';

    const result = await replitDetector.detect();
    expect(result?.isConfigured).toBe(true);
  });
});
