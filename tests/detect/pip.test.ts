import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

import { execFile } from 'node:child_process';
import { findPipPackage, pipShow } from '../../src/detect/pip.js';

const mockExecFile = vi.mocked(execFile);
const mockChildProcess = {} as ChildProcess;

function setupExecFileMock(
  behavior: (
    callback: (err: Error | null, result: { stdout: string; stderr: string }) => void,
    callIndex: number,
  ) => void,
) {
  let callIndex = 0;
  mockExecFile.mockImplementation((...rawArgs: unknown[]) => {
    callIndex++;
    const callback = rawArgs.find((a) => typeof a === 'function') as
      ((err: Error | null, result: { stdout: string; stderr: string }) => void) | undefined;
    if (callback) {
      behavior(callback, callIndex);
    }
    return mockChildProcess;
  });
}

describe('findPipPackage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns package info when pip finds the package', async () => {
    setupExecFileMock((callback) => {
      callback(null, {
        stdout: JSON.stringify([
          { name: 'sweagent', version: '0.1.0' },
          { name: 'numpy', version: '1.26.0' },
        ]),
        stderr: '',
      });
    });

    const result = await findPipPackage('sweagent');
    expect(result).toEqual({ name: 'sweagent', version: '0.1.0' });
    expect(mockExecFile).toHaveBeenCalledWith(
      'pip',
      expect.arrayContaining(['list', '--format=json']),
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('returns null when pip list succeeds but package not found', async () => {
    setupExecFileMock((callback) => {
      callback(null, {
        stdout: JSON.stringify([{ name: 'numpy', version: '1.26.0' }]),
        stderr: '',
      });
    });

    const result = await findPipPackage('sweagent');
    expect(result).toBeNull();
  });

  it('tries pip3 when first pip fails', async () => {
    setupExecFileMock((callback, callIndex) => {
      if (callIndex === 1) {
        callback(new Error('pip not found'), { stdout: '', stderr: 'not found' });
      } else {
        callback(null, {
          stdout: JSON.stringify([{ name: 'sweagent', version: '0.1.0' }]),
          stderr: '',
        });
      }
    });

    const result = await findPipPackage('sweagent');
    expect(result).toEqual({ name: 'sweagent', version: '0.1.0' });
  });

  it('returns null when both pip and pip3 fail', async () => {
    let callCount = 0;
    setupExecFileMock((callback) => {
      callCount++;
      callback(new Error('no pip'), { stdout: '', stderr: '' });
    });

    const result = await findPipPackage('nonexistent-package');
    expect(result).toBeNull();
    expect(callCount).toBe(2);
  });

  it('is case-insensitive when matching package names', async () => {
    setupExecFileMock((callback) => {
      callback(null, {
        stdout: JSON.stringify([{ name: 'Mini-Coding-Agent', version: '0.1.0' }]),
        stderr: '',
      });
    });

    const result = await findPipPackage('mini-coding-agent');
    expect(result).toEqual({ name: 'Mini-Coding-Agent', version: '0.1.0' });
  });
});

describe('pipShow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns package info from pip show output', async () => {
    setupExecFileMock((callback) => {
      callback(null, {
        stdout: ['Name: sweagent', 'Version: 0.1.0', 'Summary: SWE-agent research-first'].join(
          '\n',
        ),
        stderr: '',
      });
    });

    const result = await pipShow('sweagent');
    expect(result).toEqual({ name: 'sweagent', version: '0.1.0' });
  });

  it('returns default version when version line not in output', async () => {
    setupExecFileMock((callback) => {
      callback(null, { stdout: 'Name: sweagent\nSummary: some package\n', stderr: '' });
    });

    const result = await pipShow('sweagent');
    expect(result).toEqual({ name: 'sweagent', version: '0.0.0' });
  });

  it('returns null when Name line not found', async () => {
    setupExecFileMock((callback) => {
      callback(null, { stdout: 'Summary: something else\n', stderr: '' });
    });

    const result = await pipShow('sweagent');
    expect(result).toBeNull();
  });

  it('returns null when pip commands fail', async () => {
    setupExecFileMock((callback) => {
      callback(new Error('pip not available'), { stdout: '', stderr: 'not found' });
    });

    const result = await pipShow('sweagent');
    expect(result).toBeNull();
  });

  it('tries pip3 when pip fails', async () => {
    setupExecFileMock((callback, callIndex) => {
      if (callIndex === 1) {
        callback(new Error('pip not found'), { stdout: '', stderr: '' });
      } else {
        callback(null, { stdout: 'Name: sweagent\nVersion: 0.2.0\n', stderr: '' });
      }
    });

    const result = await pipShow('sweagent');
    expect(result).toEqual({ name: 'sweagent', version: '0.2.0' });
  });

  it('returns null when pip show finds no Name line after fallback to pip3', async () => {
    setupExecFileMock((callback, callIndex) => {
      if (callIndex === 1) {
        callback(new Error('not found'), { stdout: '', stderr: '' });
      } else {
        callback(null, { stdout: '', stderr: '' });
      }
    });

    const result = await pipShow('sweagent');
    expect(result).toBeNull();
  });
});
