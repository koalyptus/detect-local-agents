import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

import { execFile } from 'node:child_process';

const mockExecFile = vi.mocked(execFile);
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

import openhandsSdkDetector from '../../src/detectors/openhands-sdk.detector.js';

describe('openhands-sdk detector', () => {
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
