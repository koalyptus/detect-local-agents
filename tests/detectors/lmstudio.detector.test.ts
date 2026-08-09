import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { which, getVersion } from '../../src/detect/utils.js';
import { getPlatform } from '../../src/detect/platform.js';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import lmstudioDetector from '../../src/detectors/lmstudio.detector.js';

vi.mock('../../src/detect/utils.js', () => ({
  which: vi.fn(),
  getVersion: vi.fn(),
}));

vi.mock('../../src/detect/platform.js', () => ({
  getPlatform: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(),
}));

const mockWhich = vi.mocked(which);
const mockGetVersion = vi.mocked(getVersion);
const mockPlatform = vi.mocked(getPlatform);
const mockFsAccess = vi.mocked(fs.access);
const mockHomedir = vi.mocked(os.homedir);

describe('lmstudio detector', () => {
  let originalHome: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWhich.mockResolvedValue(null);
    mockGetVersion.mockResolvedValue(null);
    mockPlatform.mockReturnValue('linux');
    mockFsAccess.mockRejectedValue(new Error('not found'));
    mockHomedir.mockReturnValue('/tmp/fake-home');
    originalHome = process.env.HOME;
    process.env.HOME = '/tmp/fake-home';
  });

  afterEach(() => {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
  });

  it('returns null when lms binary not found', async () => {
    mockWhich.mockResolvedValue(null);
    expect(await lmstudioDetector.detect()).toBeNull();
  });

  it('returns agent when lms binary found on Linux', async () => {
    mockPlatform.mockReturnValue('linux');
    mockWhich.mockResolvedValue('/usr/local/bin/lms');
    mockGetVersion.mockResolvedValue('0.3.43');

    const result = await lmstudioDetector.detect();
    expect(result?.name).toBe('lmstudio');
    expect(result?.binary).toBe('/usr/local/bin/lms');
    expect(result?.version).toBe('0.3.43');
  });

  it('sets isConfigured true when ~/.lmstudio exists on Linux', async () => {
    mockPlatform.mockReturnValue('linux');
    mockWhich.mockResolvedValue('/usr/local/bin/lms');
    mockFsAccess.mockResolvedValue(undefined);

    const result = await lmstudioDetector.detect();
    expect(result?.isConfigured).toBe(true);
    expect(result?.configSource).toBe('config-dir');
  });

  it('sets isConfigured false when home dir does not exist', async () => {
    mockPlatform.mockReturnValue('linux');
    mockWhich.mockResolvedValue('/usr/local/bin/lms');
    mockFsAccess.mockRejectedValue(new Error('not found'));

    const result = await lmstudioDetector.detect();
    expect(result?.isConfigured).toBe(false);
    expect(result?.configSource).toBeUndefined();
  });

  it('returns version as undefined when getVersion returns null', async () => {
    mockPlatform.mockReturnValue('linux');
    mockWhich.mockResolvedValue('/usr/local/bin/lms');
    mockGetVersion.mockResolvedValue(null);
    mockFsAccess.mockResolvedValue(undefined);

    const result = await lmstudioDetector.detect();
    expect(result?.version).toBeUndefined();
    expect(result?.isConfigured).toBe(true);
  });

  it('resolves macOS config dir correctly', async () => {
    mockPlatform.mockReturnValue('darwin');
    mockWhich.mockResolvedValue('/usr/local/bin/lms');
    mockGetVersion.mockResolvedValue('0.3.43');
    mockFsAccess.mockResolvedValue(undefined);

    const result = await lmstudioDetector.detect();
    expect(result?.name).toBe('lmstudio');
    expect(result?.isConfigured).toBe(true);
  });

  it('resolves Windows config dir via LOCALAPPDATA', async () => {
    const originalLocalAppData = process.env.LOCALAPPDATA;
    process.env.LOCALAPPDATA = 'C:\\Users\\test\\AppData\\Local';

    mockPlatform.mockReturnValue('win32');
    mockWhich.mockResolvedValue('C:\\Users\\test\\AppData\\Local\\lmstudio\\lms.exe');
    mockGetVersion.mockResolvedValue('0.3.43');
    mockFsAccess.mockResolvedValue(undefined);

    try {
      const result = await lmstudioDetector.detect();
      expect(result?.name).toBe('lmstudio');
      expect(result?.isConfigured).toBe(true);
    } finally {
      if (originalLocalAppData === undefined) {
        delete process.env.LOCALAPPDATA;
      } else {
        process.env.LOCALAPPDATA = originalLocalAppData;
      }
    }
  });

  it('returns isConfigured false on Windows when LOCALAPPDATA unset and home dir missing', async () => {
    const originalLocalAppData = process.env.LOCALAPPDATA;
    delete process.env.LOCALAPPDATA;

    mockPlatform.mockReturnValue('win32');
    mockWhich.mockResolvedValue('/usr/local/bin/lms');
    mockFsAccess.mockRejectedValue(new Error('not found'));

    try {
      const result = await lmstudioDetector.detect();
      expect(result?.isConfigured).toBe(false);
    } finally {
      if (originalLocalAppData !== undefined) {
        process.env.LOCALAPPDATA = originalLocalAppData;
      }
    }
  });

  it('returns isConfigured false on unsupported platform', async () => {
    mockPlatform.mockReturnValue('aix');
    mockWhich.mockResolvedValue('/usr/local/bin/lms');
    mockGetVersion.mockResolvedValue('0.3.43');

    const result = await lmstudioDetector.detect();
    expect(result?.isConfigured).toBe(false);
  });

  it('returns isConfigured false on Linux when HOME and homedir are both empty', async () => {
    const originalHome = process.env.HOME;
    delete process.env.HOME;
    mockHomedir.mockReturnValue('');
    mockPlatform.mockReturnValue('linux');
    mockWhich.mockResolvedValue('/usr/local/bin/lms');
    mockFsAccess.mockResolvedValue(undefined);

    try {
      const result = await lmstudioDetector.detect();
      expect(result?.name).toBe('lmstudio');
      expect(result?.isConfigured).toBe(false);
    } finally {
      if (originalHome !== undefined) {
        process.env.HOME = originalHome;
      }
    }
  });

  it('returns isConfigured false on macOS when HOME and homedir are both empty', async () => {
    const originalHome = process.env.HOME;
    delete process.env.HOME;
    mockHomedir.mockReturnValue('');
    mockPlatform.mockReturnValue('darwin');
    mockWhich.mockResolvedValue('/usr/local/bin/lms');
    mockFsAccess.mockResolvedValue(undefined);

    try {
      const result = await lmstudioDetector.detect();
      expect(result?.name).toBe('lmstudio');
      expect(result?.isConfigured).toBe(false);
    } finally {
      if (originalHome !== undefined) {
        process.env.HOME = originalHome;
      }
    }
  });
});
