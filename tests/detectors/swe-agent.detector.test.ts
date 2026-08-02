import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';

vi.mock('../../src/detect/utils.js', () => ({
  which: vi.fn(),
  getVersion: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

import { which, getVersion } from '../../src/detect/utils.js';
import { execFile } from 'node:child_process';

const mockWhich = vi.mocked(which);
const mockGetVersion = vi.mocked(getVersion);
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

import sweAgentDetector from '../../src/detectors/swe-agent.detector.js';

describe('swe-agent detector', () => {
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
