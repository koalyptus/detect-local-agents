import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import { which, getVersion } from '../../src/detect.js';
import { getPlatform } from '../../src/detect/platform.js';
import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
}));

vi.mock('../../src/detect/platform.js', () => ({
  getPlatform: vi.fn(),
}));

const mockExecFile = vi.mocked(execFile);
const mockAccess = vi.mocked(access);
const mockPlatform = vi.mocked(getPlatform);
const mockChildProcess = {} as ChildProcess;

describe('which', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.npm_config_prefix;
    mockPlatform.mockReturnValue(process.platform);
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
    mockPlatform.mockReturnValue('win32');

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
  });

  it('uses which on non-win32', async () => {
    mockPlatform.mockReturnValue('linux');

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
      // beforeEach sets mockPlatform to host platform; result matches accordingly
      expect(path).toContain('my-agent');
      expect(path).toContain(join('/test/prefix', ''));
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
      mockPlatform.mockReturnValue('linux');

      process.env.npm_config_prefix = '/test/prefix';
      mockAccess.mockResolvedValue(undefined);
      const path = await which('my-agent');
      expect(path).toBe(join('/test/prefix', 'bin', 'my-agent'));
    });

    it('uses prefix directly (no /bin) on win32', async () => {
      mockPlatform.mockReturnValue('win32');

      process.env.npm_config_prefix = 'C:\\node-prefix';
      mockAccess.mockResolvedValue(undefined);
      const path = await which('my-agent');
      expect(path).toBe(join('C:\\node-prefix', 'my-agent'));
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
