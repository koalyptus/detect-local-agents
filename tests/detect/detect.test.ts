// tests/detect.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';

// Mock child_process to control execFile behavior
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

// Mock fs/promises so we can control access() for npm prefix fallback tests
vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
}));

import { which, getVersion } from '../../src/detect.js';
import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';

const mockExecFile = vi.mocked(execFile);
const mockAccess = vi.mocked(access);

const mockChildProcess = {} as ChildProcess;

describe('which', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.npm_config_prefix;
  });

  it('finds node binary', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: '/usr/bin/node\n', stderr: '' });
      }
      return mockChildProcess;
    });

    const path = await which('node');
    expect(path).toBe('/usr/bin/node');
  });

  it('returns null for missing binary', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(new Error('not found'), { stdout: '', stderr: '' });
      }
      return mockChildProcess;
    });

    const path = await which('this-definitely-does-not-exist-xyz123');
    expect(path).toBeNull();
  });

  it('returns null when stdout is empty', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: '', stderr: '' });
      }
      return mockChildProcess;
    });

    const path = await which('empty-output');
    expect(path).toBeNull();
  });

  it('uses where on win32', async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'win32' });

    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: 'C:\\node.exe\n', stderr: '' });
      }
      return mockChildProcess;
    });

    const path = await which('node');
    expect(path).toBe('C:\\node.exe');
    expect(mockExecFile).toHaveBeenCalledWith(
      'where',
      ['node'],
      expect.anything(),
      expect.anything(),
    );

    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('uses which on non-win32', async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'linux' });

    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: '/usr/bin/node\n', stderr: '' });
      }
      return mockChildProcess;
    });

    const path = await which('node');
    expect(path).toBe('/usr/bin/node');
    expect(mockExecFile).toHaveBeenCalledWith(
      'which',
      ['node'],
      expect.anything(),
      expect.anything(),
    );

    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  describe('npm global prefix fallback', () => {
    beforeEach(() => {
      // Make which/where command fail so we fall through to npm prefix
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('not found'), { stdout: '', stderr: '' });
        }
        return mockChildProcess;
      });
    });

    it('uses npm_config_prefix env var and finds binary', async () => {
      process.env.npm_config_prefix = '/test/prefix';
      mockAccess.mockResolvedValue(undefined);

      const path = await which('my-agent');
      // On win32 npm bin dir is prefix itself; on Linux it's prefix/bin
      const expected =
        process.platform === 'win32'
          ? join('/test/prefix', 'my-agent')
          : join('/test/prefix', 'bin', 'my-agent');
      expect(path).toBe(expected);
    });

    it('returns null when binary not in npm prefix dir', async () => {
      process.env.npm_config_prefix = '/test/prefix';
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const path = await which('missing-agent');
      expect(path).toBeNull();
    });

    it('returns null when npm_config_prefix is not set and npm config fails', async () => {
      // execFile already mocked to fail — npm config get prefix will also fail
      const path = await which('some-agent');
      expect(path).toBeNull();
    });

    it('uses prefix/bin on posix platforms', async () => {
      const origPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      process.env.npm_config_prefix = '/test/prefix';
      mockAccess.mockResolvedValue(undefined);

      const path = await which('my-agent');
      expect(path).toBe(join('/test/prefix', 'bin', 'my-agent'));

      Object.defineProperty(process, 'platform', { value: origPlatform });
    });
  });
});

describe('getVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gets node version', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: 'v20.10.0\n', stderr: '' });
      }
      return mockChildProcess;
    });

    const version = await getVersion('node', ['--version']);
    expect(version).toBe('20.10.0');
  });

  it('returns null on error', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(new Error('not found'), { stdout: '', stderr: '' });
      }
      return mockChildProcess;
    });

    const version = await getVersion('nonexistent', []);
    expect(version).toBeNull();
  });

  it('returns raw output when no version pattern found', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: 'some output without version\n', stderr: '' });
      }
      return mockChildProcess;
    });

    const version = await getVersion('node', ['--help']);
    expect(version).toBe('some output without version');
  });

  it('uses default args when not provided', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: 'v1.2.3\n', stderr: '' });
      }
      return mockChildProcess;
    });

    const version = await getVersion('myapp');
    expect(version).toBe('1.2.3');
    expect(mockExecFile).toHaveBeenCalledWith(
      'myapp',
      ['--version'],
      expect.anything(),
      expect.anything(),
    );
  });
});
