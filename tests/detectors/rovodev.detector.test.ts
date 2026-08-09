import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';

vi.mock('../../src/detect/utils.js', () => ({
  which: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

import { which } from '../../src/detect/utils.js';
import { execFile } from 'node:child_process';

const mockWhich = vi.mocked(which);
const mockExecFile = vi.mocked(execFile);
const mockChildProcess = {} as ChildProcess;

import rovodevDetector from '../../src/detectors/rovodev.detector.js';

describe('rovodev detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: acli exists, probe returns empty stdout (=> not detected).
    // Hermetic: execFile is mocked, so no real `acli` subprocess is spawned.
    mockWhich.mockResolvedValue('/usr/bin/acli');
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: '', stderr: '' });
      }
      return mockChildProcess;
    });
  });

  it('returns null when acli not found', async () => {
    mockWhich.mockResolvedValue(null);

    const result = await rovodevDetector.detect();
    expect(result).toBeNull();
  });

  it('returns null when probe fails', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(new Error('Command failed'), { stdout: '' });
      }
      return mockChildProcess;
    });

    const result = await rovodevDetector.detect();
    expect(result).toBeNull();
  });

  it('returns null when probe returns empty stdout', async () => {
    const result = await rovodevDetector.detect();
    expect(result).toBeNull();
  });

  it('returns agent with configSource probe when probe succeeds', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: 'rovodev help output' });
      }
      return mockChildProcess;
    });

    const result = await rovodevDetector.detect();
    expect(result).not.toBeNull();
    expect(result?.name).toBe('rovodev');
    expect(result?.binary).toBe('/usr/bin/acli');
    expect(result?.isConfigured).toBe(true);
    expect(result?.configSource).toBe('probe');
    expect(result?.metadata?.acliBinary).toBe('/usr/bin/acli');
  });
});
