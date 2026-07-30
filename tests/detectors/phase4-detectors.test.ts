// tests/detectors/phase4-detectors.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import type { PathLike } from 'node:fs';
// Mock detect module
vi.mock('../../src/detect.js', () => ({
  which: vi.fn(),
  getVersion: vi.fn(),
}));

// Mock platform utility
vi.mock('../../src/detect/platform.js', () => ({
  getPlatform: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  readdir: vi.fn(),
}));

import { which, getVersion } from '../../src/detect.js';
import { getPlatform } from '../../src/detect/platform.js';
import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';

const mockWhich = vi.mocked(which);
const mockGetVersion = vi.mocked(getVersion);
const mockPlatform = vi.mocked(getPlatform);
const mockExecFile = vi.mocked(execFile);
const mockFsAccess = vi.mocked(fs.access);
const mockFsReaddir = vi.mocked(fs.readdir);
const mockChildProcess = {} as ChildProcess;

function setupMockExecFile(
  behavior: (
    callback: (err: Error | null, result: { stdout: string; stderr: string }) => void,
    callIndex: number,
  ) => void,
) {
  let callIndex = 0;
  mockExecFile.mockImplementation((...rawArgs) => {
    callIndex++;
    const callback = rawArgs.find((a) => typeof a === 'function') as
      ((err: Error | null, result: { stdout: string; stderr: string }) => void) | undefined;
    if (callback) {
      behavior(callback, callIndex);
    }
    return mockChildProcess;
  });
}

import orcaDetector from '../../src/detectors/orca.detector.js';
import windsurfDetector from '../../src/detectors/windsurf.detector.js';
import sweAgentDetector from '../../src/detectors/swe-agent.detector.js';
import miniCodingAgentDetector from '../../src/detectors/mini-coding-agent.detector.js';
import openhandsSdkDetector from '../../src/detectors/openhands-sdk.detector.js';

// ── Orca ───────────────────────────────────────────────────────
describe('orca detector (Phase 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when orca not found', async () => {
    mockWhich.mockResolvedValue(null);
    expect(await orcaDetector.detect()).toBeNull();
  });

  it('returns agent when orca found (not configured)', async () => {
    mockWhich.mockResolvedValue('/usr/bin/orca');
    mockFsAccess.mockRejectedValue(new Error('not found'));

    const result = await orcaDetector.detect();
    expect(result?.name).toBe('orca');
    expect(result?.binary).toBe('/usr/bin/orca');
    expect(result?.isConfigured).toBe(false);
    expect(result?.isACPAgent).toBe(true);
  });

  it('returns agent when orca found and configured with config files', async () => {
    mockWhich.mockResolvedValue('/usr/bin/orca');
    mockFsAccess.mockResolvedValue(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFsReaddir.mockResolvedValue(['agents.json', 'config.yaml', 'cache.db'] as any);

    const result = await orcaDetector.detect();
    expect(result?.name).toBe('orca');
    expect(result?.isConfigured).toBe(true);
    expect(result?.metadata?.managedAgents).toEqual(['agents.json', 'config.yaml']);
  });

  it('handles readdir failure gracefully', async () => {
    mockWhich.mockResolvedValue('/usr/bin/orca');
    mockFsAccess.mockResolvedValue(undefined);
    mockFsReaddir.mockRejectedValue(new Error('permission denied'));

    const result = await orcaDetector.detect();
    expect(result?.name).toBe('orca');
    expect(result?.isConfigured).toBe(true);
    expect(result?.metadata?.managedAgents).toEqual([]);
  });
});

// ── Windsurf ───────────────────────────────────────────────────
describe('windsurf detector (Phase 4)', () => {
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

    const mockAccessCalls: string[] = [];
    mockFsAccess.mockImplementation(async (path: unknown) => {
      const pathStr = String(path);
      mockAccessCalls.push(pathStr);

      if (
        pathStr.includes('/opt/Windsurf/windsurf') ||
        pathStr.includes('/usr/bin/windsurf') ||
        pathStr.includes('/usr/local/bin/windsurf')
      ) {
        return undefined; // Success - file exists
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
      .mockResolvedValueOnce(undefined) // .codeium
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
      .mockResolvedValueOnce(undefined) // first path succeeds
      .mockRejectedValue(new Error('not found')); // subsequent calls fail

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

// ── SWE-agent ──────────────────────────────────────────────────
describe('swe-agent detector (Phase 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when binary nor pip package found', async () => {
    mockWhich.mockResolvedValue(null);
    setupMockExecFile((callback) => {
      callback(null, { stdout: '[]', stderr: '' });
    });

    expect(await sweAgentDetector.detect()).toBeNull();
  });

  it('returns agent when sweagent binary found', async () => {
    mockWhich.mockResolvedValue('/usr/bin/sweagent');
    mockGetVersion.mockResolvedValue('0.2.0');

    const result = await sweAgentDetector.detect();
    expect(result?.name).toBe('swe-agent');
    expect(result?.binary).toBe('/usr/bin/sweagent');
    expect(result?.version).toBe('0.2.0');
  });

  it('returns agent when sweagent binary found but version unavailable', async () => {
    mockWhich.mockResolvedValue('/usr/bin/sweagent');
    mockGetVersion.mockResolvedValue(null);

    const result = await sweAgentDetector.detect();
    expect(result?.name).toBe('swe-agent');
    expect(result?.binary).toBe('/usr/bin/sweagent');
    expect(result?.version).toBeUndefined();
  });

  it('returns agent via pip detection when binary not found', async () => {
    mockWhich.mockResolvedValue(null);
    setupMockExecFile((callback) => {
      callback(null, {
        stdout: JSON.stringify([{ name: 'sweagent', version: '0.1.0' }]),
        stderr: '',
      });
    });

    const result = await sweAgentDetector.detect();
    expect(result?.name).toBe('swe-agent');
    expect(result?.binary).toBe('sweagent');
    expect(result?.version).toBe('0.1.0');
  });

  it('returns agent with isConfigured true when env vars set', async () => {
    const orig = process.env['OPENAI_API_KEY'];
    process.env['OPENAI_API_KEY'] = 'sk-test';

    mockWhich.mockResolvedValue('/usr/bin/sweagent');
    mockGetVersion.mockResolvedValue('0.2.0');

    const result = await sweAgentDetector.detect();
    expect(result?.isConfigured).toBe(true);

    if (orig === undefined) {
      delete process.env['OPENAI_API_KEY'];
    } else {
      process.env['OPENAI_API_KEY'] = orig;
    }
  });
});

// ── mini-coding-agent ──────────────────────────────────────────
describe('mini-coding-agent detector (Phase 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when pip package not found', async () => {
    setupMockExecFile((callback) => {
      callback(null, { stdout: '[]', stderr: '' });
    });

    expect(await miniCodingAgentDetector.detect()).toBeNull();
  });

  it('returns agent when pip package found', async () => {
    setupMockExecFile((callback) => {
      callback(null, {
        stdout: JSON.stringify([{ name: 'mini-coding-agent', version: '0.1.0' }]),
        stderr: '',
      });
    });

    const result = await miniCodingAgentDetector.detect();
    expect(result?.name).toBe('mini-coding-agent');
    expect(result?.binary).toBe('mini-coding-agent');
    expect(result?.version).toBe('0.1.0');
  });
});

// ── OpenHands SDK ──────────────────────────────────────────────
describe('openhands-sdk detector (Phase 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when pip package not found', async () => {
    setupMockExecFile((callback) => {
      callback(null, { stdout: '[]', stderr: '' });
    });

    expect(await openhandsSdkDetector.detect()).toBeNull();
  });

  it('returns agent when pip package found', async () => {
    setupMockExecFile((callback) => {
      callback(null, {
        stdout: JSON.stringify([{ name: 'openhands-sdk', version: '1.0.0' }]),
        stderr: '',
      });
    });

    const result = await openhandsSdkDetector.detect();
    expect(result?.name).toBe('openhands-sdk');
    expect(result?.binary).toBe('openhands-sdk');
    expect(result?.version).toBe('1.0.0');
  });
});
