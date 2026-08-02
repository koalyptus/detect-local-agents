import { describe, it, expect, vi, beforeEach } from 'vitest';
import { which, getVersion } from '../../src/detect-utils.js';
import { access } from 'node:fs/promises';
import geminiDetector from '../../src/detectors/gemini.detector.js';

vi.mock('../../src/detect-utils.js', () => ({
  which: vi.fn(),
  getVersion: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
}));

const mockWhich = vi.mocked(which);
const mockGetVersion = vi.mocked(getVersion);
const mockFsAccess = vi.mocked(access);

describe('antigravity detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhich.mockResolvedValue(null);
    mockGetVersion.mockResolvedValue(null);
    mockFsAccess.mockRejectedValue(new Error('not found'));
  });

  it('returns null when neither agy nor gemini binary found', async () => {
    expect(await geminiDetector.detect()).toBeNull();
  });

  it('returns agent when agy binary found (new codename)', async () => {
    mockWhich.mockImplementation(async (name: string) => {
      if (name === 'agy') {
        return '/usr/bin/agy';
      }
      return null;
    });
    mockGetVersion.mockResolvedValue('0.55.0');

    const result = await geminiDetector.detect();
    expect(result?.name).toBe('antigravity');
    expect(result?.binary).toBe('/usr/bin/agy');
    expect(result?.version).toBe('0.55.0');
  });

  it('returns agent when gemini binary found (legacy fallback)', async () => {
    mockWhich.mockImplementation(async (name: string) => {
      if (name === 'gemini') {
        return '/usr/bin/gemini';
      }
      return null;
    });
    mockGetVersion.mockResolvedValue('0.53.0');

    const result = await geminiDetector.detect();
    expect(result?.name).toBe('gemini');
    expect(result?.binary).toBe('/usr/bin/gemini');
    expect(result?.version).toBe('0.53.0');
  });

  it('prefers agy over gemini when both are available', async () => {
    mockWhich.mockImplementation(async (name: string) => {
      if (name === 'agy') {
        return '/usr/bin/agy';
      }
      return '/usr/bin/gemini';
    });
    mockGetVersion.mockResolvedValue('0.55.0');

    const result = await geminiDetector.detect();
    expect(result?.binary).toBe('/usr/bin/agy');
  });

  it('sets isConfigured true when GOOGLE_API_KEY is set', async () => {
    const orig = process.env['GOOGLE_API_KEY'];
    process.env['GOOGLE_API_KEY'] = 'test-key';
    mockWhich.mockResolvedValue('/usr/bin/agy');

    const result = await geminiDetector.detect();
    expect(result?.isConfigured).toBe(true);

    if (orig === undefined) {
      delete process.env['GOOGLE_API_KEY'];
    } else {
      process.env['GOOGLE_API_KEY'] = orig;
    }
  });

  it('sets isConfigured true when ANTIGRAVITY_API_KEY is set', async () => {
    const orig = process.env['ANTIGRAVITY_API_KEY'];
    process.env['ANTIGRAVITY_API_KEY'] = 'test-key';
    mockWhich.mockResolvedValue('/usr/bin/agy');

    const result = await geminiDetector.detect();
    expect(result?.isConfigured).toBe(true);

    if (orig === undefined) {
      delete process.env['ANTIGRAVITY_API_KEY'];
    } else {
      process.env['ANTIGRAVITY_API_KEY'] = orig;
    }
  });

  it('sets isConfigured true when ~/.gemini directory exists', async () => {
    mockWhich.mockResolvedValue('/usr/bin/agy');
    mockFsAccess.mockResolvedValue(undefined);

    const result = await geminiDetector.detect();
    expect(result?.isConfigured).toBe(true);
  });

  it('returns version as undefined when getVersion returns null', async () => {
    mockWhich.mockResolvedValue('/usr/bin/agy');
    mockGetVersion.mockResolvedValue(null);

    const result = await geminiDetector.detect();
    expect(result?.version).toBeUndefined();
  });
});
