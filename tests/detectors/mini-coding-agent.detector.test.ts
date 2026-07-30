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

import miniCodingAgentDetector from '../../src/detectors/mini-coding-agent.detector.js';

describe('mini-coding-agent detector', () => {
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
