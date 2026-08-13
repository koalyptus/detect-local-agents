import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectAgents } from '../src/index.js';
import type { DetectOptions } from '../src/types.js';

const { mockWhich, mockGetVersion, mockExecFile } = vi.hoisted(() => ({
  mockWhich: vi.fn(),
  mockGetVersion: vi.fn(),
  mockExecFile: vi.fn(),
}));

vi.mock('../src/detect/utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/detect/utils.js')>();
  return {
    ...actual,
    which: mockWhich,
    getVersion: mockGetVersion,
  };
});

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    execFile: mockExecFile,
  };
});

describe('detectAgents options integration (file-based detectors)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // By default nothing is present
    mockWhich.mockResolvedValue(null);
    mockGetVersion.mockResolvedValue(null);
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(new Error('not found'), { stdout: '', stderr: '' });
      }
      return undefined as unknown as ReturnType<typeof import('node:child_process').execFile>;
    });
  });

  it('loadAllDetectors passes probe:false to acpx and returns isConfigured=undefined', async () => {
    mockWhich.mockImplementation(async (name) => {
      if (name === 'acpx' || name === 'acli') {
        return '/usr/bin/' + name;
      }
      return null;
    });
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: 'target1\n', stderr: '' });
      }
      return undefined as unknown as ReturnType<typeof import('node:child_process').execFile>;
    });

    const agents = await detectAgents({ only: ['acpx'], probe: false } satisfies DetectOptions);
    expect(agents.length).toBe(1);
    expect(agents[0].name).toBe('acpx');
    expect(agents[0].isConfigured).toBeUndefined();
    expect(agents[0].configSource).toBeUndefined();
    // execFile must not be called for acpx list when probe is false
    expect(mockExecFile).not.toHaveBeenCalled();
  });

  it('loadAllDetectors passes probe:false to rovodev and returns isConfigured=undefined', async () => {
    mockWhich.mockImplementation(async (name) => {
      if (name === 'acli') {
        return '/usr/bin/acli';
      }
      return null;
    });
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: 'rovodev help output', stderr: '' });
      }
      return undefined as unknown as ReturnType<typeof import('node:child_process').execFile>;
    });

    const agents = await detectAgents({ only: ['rovodev'], probe: false } satisfies DetectOptions);
    expect(agents.length).toBe(1);
    expect(agents[0].name).toBe('rovodev');
    expect(agents[0].isConfigured).toBeUndefined();
    expect(agents[0].configSource).toBeUndefined();
    expect(mockExecFile).not.toHaveBeenCalled();
  });

  it('loadAllDetectors passes timeout override to acpx list', async () => {
    mockWhich.mockImplementation(async (name) => {
      if (name === 'acpx') {
        return '/usr/bin/acpx';
      }
      return null;
    });
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: 'target1\n', stderr: '' });
      }
      return undefined as unknown as ReturnType<typeof import('node:child_process').execFile>;
    });

    const agents = await detectAgents({ only: ['acpx'], timeout: 123 } satisfies DetectOptions);
    expect(agents.length).toBe(1);
    expect(mockExecFile).toHaveBeenCalledWith(
      '/usr/bin/acpx',
      ['list'],
      expect.objectContaining({ timeout: 123 }),
      expect.anything(),
    );
  });

  it('loadAllDetectors passes timeout override to rovodev --help', async () => {
    mockWhich.mockImplementation(async (name) => {
      if (name === 'acli') {
        return '/usr/bin/acli';
      }
      return null;
    });
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: 'rovodev help', stderr: '' });
      }
      return undefined as unknown as ReturnType<typeof import('node:child_process').execFile>;
    });

    const agents = await detectAgents({ only: ['rovodev'], timeout: 456 } satisfies DetectOptions);
    expect(agents.length).toBe(1);
    expect(mockExecFile).toHaveBeenCalledWith(
      '/usr/bin/acli',
      ['rovodev', '--help'],
      expect.objectContaining({ timeout: 456 }),
      expect.anything(),
    );
  });
});
