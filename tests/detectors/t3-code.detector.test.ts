import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { which, getVersion } from '../../src/detect/utils.js';
import { getPlatform } from '../../src/detect/platform.js';
import * as fs from 'node:fs/promises';
import { homedir } from 'node:os';
import t3CodeDetector from '../../src/detectors/t3-code.detector.js';

vi.mock('../../src/detect/utils.js', () => ({
  which: vi.fn(),
  getVersion: vi.fn(),
}));

vi.mock('../../src/detect/platform.js', () => ({
  getPlatform: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  stat: vi.fn(),
  readdir: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(),
}));

const mockWhich = vi.mocked(which);
const mockGetVersion = vi.mocked(getVersion);
const mockPlatform = vi.mocked(getPlatform);
const mockFsAccess = vi.mocked(fs.access);
const mockFsStat = vi.mocked(fs.stat);
const mockFsReaddir = vi.mocked(fs.readdir);
const mockHomedir = vi.mocked(homedir);

describe('t3-code detector', () => {
  let originalHome: string | undefined;
  let originalAppData: string | undefined;
  let originalLocalAppData: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWhich.mockResolvedValue(null);
    mockGetVersion.mockResolvedValue(null);
    mockPlatform.mockReturnValue('linux');
    mockFsAccess.mockRejectedValue(new Error('not found'));
    mockFsStat.mockRejectedValue(new Error('not found'));
    mockFsReaddir.mockRejectedValue(new Error('not found'));
    mockHomedir.mockReturnValue('/home/test');
    originalHome = process.env.HOME;
    originalAppData = process.env.APPDATA;
    originalLocalAppData = process.env.LOCALAPPDATA;
    process.env.HOME = '/home/test';
  });

  afterEach(() => {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    if (originalAppData === undefined) {
      delete process.env.APPDATA;
    } else {
      process.env.APPDATA = originalAppData;
    }
    if (originalLocalAppData === undefined) {
      delete process.env.LOCALAPPDATA;
    } else {
      process.env.LOCALAPPDATA = originalLocalAppData;
    }
  });

  it('returns null when not found via which or common paths', async () => {
    mockPlatform.mockReturnValue('linux');
    mockWhich.mockResolvedValue(null);
    mockFsStat.mockRejectedValue(new Error('not found'));

    expect(await t3CodeDetector.detect()).toBeNull();
  });

  it('returns agent when found via which (t3-code)', async () => {
    mockWhich.mockResolvedValue('/usr/local/bin/t3-code');
    mockGetVersion.mockResolvedValue('0.0.32');

    const result = await t3CodeDetector.detect();
    expect(result).not.toBeNull();
    expect(result?.name).toBe('t3-code');
    expect(result?.binary).toBe('/usr/local/bin/t3-code');
    expect(result?.version).toBe('0.0.32');
  });

  it('returns version undefined when getVersion returns null', async () => {
    mockWhich.mockResolvedValue('/usr/local/bin/t3-code');
    mockGetVersion.mockResolvedValue(null);

    const result = await t3CodeDetector.detect();
    expect(result?.version).toBeUndefined();
  });

  it('returns agent when found via linux common path (/opt/t3code)', async () => {
    mockWhich.mockResolvedValue(null);
    mockPlatform.mockReturnValue('linux');
    mockFsStat.mockImplementation(async (p: unknown) => {
      if (String(p) === '/opt/t3code/T3 Code') {
        return { isDirectory: () => false } as Awaited<ReturnType<typeof fs.stat>>;
      }
      throw new Error('not found');
    });

    const result = await t3CodeDetector.detect();
    expect(result?.name).toBe('t3-code');
    expect(result?.binary).toBe('/opt/t3code/T3 Code');
  });

  it('returns agent when found via linux third common path (homebrew)', async () => {
    mockWhich.mockResolvedValue(null);
    mockPlatform.mockReturnValue('linux');
    // First two paths reject, third resolves
    mockFsStat.mockImplementation(async (p: unknown) => {
      if (String(p) === '/opt/homebrew/bin/t3') {
        return { isDirectory: () => false } as Awaited<ReturnType<typeof fs.stat>>;
      }
      throw new Error('not found');
    });

    const result = await t3CodeDetector.detect();
    expect(result?.name).toBe('t3-code');
    expect(result?.binary).toBe('/opt/homebrew/bin/t3');
  });

  it('returns agent when found via macOS /Applications path', async () => {
    mockWhich.mockResolvedValue(null);
    mockPlatform.mockReturnValue('darwin');
    mockFsStat.mockImplementation(async (p: unknown) => {
      if (String(p) === '/Applications/T3 Code.app/Contents/MacOS/T3 Code') {
        return { isDirectory: () => false } as Awaited<ReturnType<typeof fs.stat>>;
      }
      throw new Error('not found');
    });

    const result = await t3CodeDetector.detect();
    expect(result?.name).toBe('t3-code');
    expect(result?.binary).toBe('/Applications/T3 Code.app/Contents/MacOS/T3 Code');
  });

  it('returns agent when found via macOS homebrew path', async () => {
    mockWhich.mockResolvedValue(null);
    mockPlatform.mockReturnValue('darwin');
    mockFsStat.mockImplementation(async (p: unknown) => {
      if (String(p) === '/opt/homebrew/bin/t3') {
        return { isDirectory: () => false } as Awaited<ReturnType<typeof fs.stat>>;
      }
      throw new Error('not found');
    });

    const result = await t3CodeDetector.detect();
    expect(result?.name).toBe('t3-code');
    expect(result?.binary).toBe('/opt/homebrew/bin/t3');
  });

  it('returns agent when found via windows first common path', async () => {
    mockWhich.mockResolvedValue(null);
    mockPlatform.mockReturnValue('win32');
    process.env.APPDATA = 'C:\\Users\\test\\AppData\\Roaming';
    mockFsStat.mockImplementation(async (p: unknown) => {
      if (String(p) === 'C:\\Program Files\\T3 Code\\T3 Code.exe') {
        return { isDirectory: () => false } as Awaited<ReturnType<typeof fs.stat>>;
      }
      throw new Error('not found');
    });

    const result = await t3CodeDetector.detect();
    expect(result?.name).toBe('t3-code');
    expect(result?.binary).toBe('C:\\Program Files\\T3 Code\\T3 Code.exe');
  });

  it('returns agent when found via windows LOCALAPPDATA directory scan', async () => {
    mockWhich.mockResolvedValue(null);
    mockPlatform.mockReturnValue('win32');
    process.env.APPDATA = 'C:\\Users\\test\\AppData\\Roaming';
    process.env.LOCALAPPDATA = 'C:\\Users\\test\\AppData\\Local';
    const installDir = 'C:\\Users\\test\\AppData\\Local\\Programs\\t3code';
    mockFsStat.mockImplementation(async (p: unknown) => {
      if (String(p) === installDir) {
        return { isDirectory: () => true } as Awaited<ReturnType<typeof fs.stat>>;
      }
      throw new Error('not found');
    });
    mockFsReaddir.mockImplementation(async (p: unknown) => {
      if (String(p) === installDir) {
        return ['T3 Code (Alpha).exe', 'Uninstall T3 Code (Alpha).exe', 'resources'] as Awaited<
          ReturnType<typeof fs.readdir>
        >;
      }
      throw new Error('not found');
    });

    const result = await t3CodeDetector.detect();
    expect(result?.name).toBe('t3-code');
    // join() on Linux uses forward slashes; normalize for comparison
    expect(result?.binary).toBe(join(installDir, 'T3 Code (Alpha).exe'));
  });

  it('returns null when windows common paths all fail', async () => {
    mockWhich.mockResolvedValue(null);
    mockPlatform.mockReturnValue('win32');
    process.env.APPDATA = 'C:\\Users\\test\\AppData\\Roaming';
    mockFsStat.mockRejectedValue(new Error('not found'));

    expect(await t3CodeDetector.detect()).toBeNull();
  });

  it('sets isConfigured true when config dir exists on linux', async () => {
    mockWhich.mockResolvedValue('/usr/local/bin/t3-code');
    mockGetVersion.mockResolvedValue('0.0.32');
    mockPlatform.mockReturnValue('linux');
    const configDir = join('/home/test', '.config', 't3code');
    // stat is used for fallback path detection (binary found via which, so stat won't be called)
    // access is used for isConfigured check
    mockFsAccess.mockImplementation(async (p: unknown) => {
      if (String(p) === configDir) {
        return;
      }
      throw new Error('not found');
    });

    const result = await t3CodeDetector.detect();
    expect(result?.isConfigured).toBe(true);
  });

  it('sets isConfigured true when config dir exists on macOS', async () => {
    mockWhich.mockResolvedValue('/Applications/T3 Code.app/Contents/MacOS/T3 Code');
    mockGetVersion.mockResolvedValue('0.0.32');
    mockPlatform.mockReturnValue('darwin');
    const configDir = join('/home/test', 'Library', 'Application Support', 't3code');
    mockFsAccess.mockImplementation(async (p: unknown) => {
      if (String(p) === configDir) {
        return;
      }
      throw new Error('not found');
    });

    const result = await t3CodeDetector.detect();
    expect(result?.isConfigured).toBe(true);
  });

  it('sets isConfigured true when config dir exists on windows', async () => {
    mockWhich.mockResolvedValue('C:\\Program Files\\T3 Code\\T3 Code.exe');
    mockGetVersion.mockResolvedValue('0.0.32');
    mockPlatform.mockReturnValue('win32');
    process.env.APPDATA = 'C:\\Users\\test\\AppData\\Roaming';
    // getConfigDir uses forward-slash join: APPDATA + '/t3code'
    const configDir = 'C:\\Users\\test\\AppData\\Roaming/t3code';
    mockFsAccess.mockImplementation(async (p: unknown) => {
      if (String(p) === configDir) {
        return;
      }
      throw new Error('not found');
    });

    const result = await t3CodeDetector.detect();
    expect(result?.isConfigured).toBe(true);
  });

  it('sets isConfigured false when config dir does not exist', async () => {
    mockWhich.mockResolvedValue('/usr/local/bin/t3-code');
    mockGetVersion.mockResolvedValue('0.0.32');
    mockPlatform.mockReturnValue('linux');
    // config dir access also rejects → isConfigured false
    mockFsAccess.mockRejectedValue(new Error('not found'));

    const result = await t3CodeDetector.detect();
    expect(result?.isConfigured).toBe(false);
  });

  it('sets isConfigured false on win32 when APPDATA is not set', async () => {
    mockWhich.mockResolvedValue('C:\\Program Files\\T3 Code\\T3 Code.exe');
    mockGetVersion.mockResolvedValue('0.0.32');
    mockPlatform.mockReturnValue('win32');
    delete process.env.APPDATA;
    // getConfigDir returns null → isConfigured stays false
    mockFsStat.mockRejectedValue(new Error('not found'));

    const result = await t3CodeDetector.detect();
    expect(result?.isConfigured).toBe(false);
  });

  it('sets isConfigured false on unsupported platform', async () => {
    mockWhich.mockResolvedValue('/usr/bin/t3-code');
    mockGetVersion.mockResolvedValue('0.0.32');
    mockPlatform.mockReturnValue('aix');
    mockFsStat.mockRejectedValue(new Error('not found'));

    const result = await t3CodeDetector.detect();
    expect(result?.isConfigured).toBe(false);
  });

  it('returns null on unsupported platform when binary not found', async () => {
    mockWhich.mockResolvedValue(null);
    mockPlatform.mockReturnValue('aix');
    mockFsStat.mockRejectedValue(new Error('not found'));

    expect(await t3CodeDetector.detect()).toBeNull();
  });

  it('handles empty homedir fallback on linux', async () => {
    // getConfigDir: HOME empty, homedir() returns '' → home falsy → returns null → isConfigured false
    delete process.env.HOME;
    mockHomedir.mockReturnValue('');
    mockWhich.mockResolvedValue('/usr/local/bin/t3-code');
    mockGetVersion.mockResolvedValue('1.0.0');
    mockPlatform.mockReturnValue('linux');
    mockFsStat.mockRejectedValue(new Error('not found'));

    const result = await t3CodeDetector.detect();
    expect(result).not.toBeNull();
    expect(result?.isConfigured).toBe(false);
  });
});
