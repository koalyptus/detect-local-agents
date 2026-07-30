import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PathLike } from 'node:fs';

vi.mock('../../src/detect.js', () => ({
  which: vi.fn(),
  getVersion: vi.fn(),
}));

vi.mock('../../src/detect/platform.js', () => ({
  getPlatform: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  readdir: vi.fn(),
}));

import { which } from '../../src/detect.js';
import { getPlatform } from '../../src/detect/platform.js';
import * as fs from 'node:fs/promises';

const mockWhich = vi.mocked(which);
const mockPlatform = vi.mocked(getPlatform);
const mockFsAccess = vi.mocked(fs.access);

import windsurfDetector from '../../src/detectors/windsurf.detector.js';

describe('windsurf detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when neither windsurf nor codeium found', async () => {
    mockWhich.mockResolvedValue(null);
    mockFsAccess.mockRejectedValue(new Error('not found'));

    expect(await windsurfDetector.detect()).toBeNull();
  });

  it('returns agent when windsurf binary found via which', async () => {
    mockWhich.mockImplementation(async (name: string) => {
      if (name === 'windsurf') {
        return '/usr/local/bin/windsurf';
      }
      return null;
    });
    mockFsAccess.mockRejectedValue(new Error('not found'));

    const result = await windsurfDetector.detect();
    expect(result?.name).toBe('windsurf');
    expect(result?.binary).toBe('/usr/local/bin/windsurf');
    expect(result?.isACPAgent).toBe(true);
  });

  it('returns agent when codeium binary found via which', async () => {
    mockWhich.mockImplementation(async (name: string) => {
      if (name === 'codeium') {
        return '/usr/bin/codeium';
      }
      return null;
    });
    mockFsAccess.mockRejectedValue(new Error('not found'));

    const result = await windsurfDetector.detect();
    expect(result?.name).toBe('windsurf');
    expect(result?.binary).toBe('/usr/bin/codeium');
    expect(result?.isACPAgent).toBe(true);
  });

  it('finds windsurf through common Linux install paths', async () => {
    vi.clearAllMocks();
    mockWhich.mockResolvedValue(null);
    mockPlatform.mockReturnValue(process.platform);

    const mockAccessCalls: string[] = [];
    mockFsAccess.mockImplementation(async (path: unknown) => {
      const pathStr = String(path);
      mockAccessCalls.push(pathStr);

      if (
        pathStr.includes('/opt/Windsurf/windsurf') ||
        pathStr.includes('/usr/bin/windsurf') ||
        pathStr.includes('/usr/local/bin/windsurf')
      ) {
        return undefined;
      }

      throw new Error('not found');
    });

    const result = await windsurfDetector.detect();
    if (process.platform === 'linux') {
      expect(result?.name).toBe('windsurf');
    } else {
      expect(result).toBeNull();
    }
  });

  it('detects as configured when .codeium directory exists', async () => {
    mockWhich.mockResolvedValue('/usr/bin/windsurf');
    mockFsAccess.mockResolvedValue(undefined);

    const result = await windsurfDetector.detect();
    expect(result?.isConfigured).toBe(true);
  });

  it('detects as configured when .windsurf directory exists', async () => {
    mockWhich.mockResolvedValue('/usr/bin/windsurf');
    mockFsAccess
      .mockResolvedValueOnce(undefined)
      .mockImplementation(async (p: PathLike) => {
        if ((p as string).includes('.windsurf')) {
          return;
        }
        throw new Error('not found');
      });

    const result = await windsurfDetector.detect();
    expect(result?.isConfigured).toBe(true);
  });

  it('covers macOS common install paths and fs.access loop', async () => {
    mockWhich.mockResolvedValue(null);
    mockPlatform.mockReturnValue('darwin');
    mockFsAccess
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(new Error('not found'));

    const result = await windsurfDetector.detect();
    expect(result?.name).toBe('windsurf');
    expect(result?.binary).toMatch(/Windsurf/);
    expect(mockFsAccess).toHaveBeenCalled();
  });

  it('covers Linux common install paths', async () => {
    mockWhich.mockResolvedValue(null);
    mockPlatform.mockReturnValue('linux');
    mockFsAccess.mockResolvedValueOnce(undefined).mockRejectedValue(new Error('not found'));

    const result = await windsurfDetector.detect();
    expect(result?.name).toBe('windsurf');
    expect(result?.binary).toMatch(/Windsurf/);
  });

  it('covers common paths returning null when all fail', async () => {
    mockWhich.mockResolvedValue(null);
    mockPlatform.mockReturnValue('darwin');
    mockFsAccess.mockRejectedValue(new Error('not found'));

    const result = await windsurfDetector.detect();
    expect(result).toBeNull();
  });
});
