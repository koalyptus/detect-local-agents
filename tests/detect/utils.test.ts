import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import { which, getVersion } from '../../src/detect/utils.js';
import { getPlatform } from '../../src/detect/platform.js';
import { exec, execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import * as os from 'node:os';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
  exec: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
}));

vi.mock('../../src/detect/platform.js', () => ({
  getPlatform: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(),
}));

const mockExecFile = vi.mocked(execFile);
const mockExec = vi.mocked(exec);
const mockAccess = vi.mocked(access);
const mockPlatform = vi.mocked(getPlatform);
const mockHomedir = vi.mocked(os.homedir);
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
    mockAccess.mockRejectedValue(new Error('ENOENT'));

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
    mockAccess.mockRejectedValue(new Error('ENOENT'));

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

  it('handles CRLF output from where on win32', async () => {
    mockPlatform.mockReturnValue('win32');

    // Windows where.exe returns multiple matches joined by \r\n; a plain
    // split('\n') would keep a trailing \r on the first path.
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: 'C:\\node.exe\r\nC:\\tools\\node.exe\r\n', stderr: '' });
      }
      return mockChildProcess;
    });

    const path = await which('node');
    expect(path).toBe('C:\\node.exe');
  });

  it('returns first match only when where returns multiple lines', async () => {
    mockPlatform.mockReturnValue('win32');

    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: 'C:\\first.exe\nC:\\second.exe\n', stderr: '' });
      }
      return mockChildProcess;
    });

    const path = await which('node');
    expect(path).toBe('C:\\first.exe');
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

    it('finds .cmd shim when bare name is missing on win32', async () => {
      mockPlatform.mockReturnValue('win32');

      process.env.npm_config_prefix = 'C:\\node-prefix';
      // Bare name doesn't exist; the .cmd shim does (npm on Windows installs
      // claude.cmd rather than extension-less binaries).
      mockAccess.mockRejectedValueOnce(new Error('ENOENT')).mockResolvedValueOnce(undefined);

      const path = await which('my-agent');
      expect(path).toBe(join('C:\\node-prefix', 'my-agent.cmd'));
    });

    it('finds .exe shim when bare name and .cmd are missing on win32', async () => {
      mockPlatform.mockReturnValue('win32');

      process.env.npm_config_prefix = 'C:\\node-prefix';
      mockAccess
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockResolvedValueOnce(undefined);

      const path = await which('my-agent');
      expect(path).toBe(join('C:\\node-prefix', 'my-agent.exe'));
    });
  });

  describe('well-known install directory fallback', () => {
    const savedEnv = {} as Record<string, string | undefined>;

    beforeEach(() => {
      // Save and clean platform-specific env vars
      for (const key of ['APPDATA', 'LOCALAPPDATA', 'USERPROFILE', 'HOME', 'npm_config_prefix']) {
        savedEnv[key] = process.env[key];
        delete process.env[key];
      }
      mockHomedir.mockReturnValue('/fallback-home');
    });

    afterEach(() => {
      // Restore env vars
      for (const key of Object.keys(savedEnv)) {
        if (savedEnv[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = savedEnv[key];
        }
      }
      vi.restoreAllMocks();
    });

    it('skips known dirs when PATH succeeds (ordering guard)', async () => {
      mockPlatform.mockReturnValue('linux');
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(null, { stdout: '/usr/bin/node\n', stderr: '' });
        }
        return mockChildProcess;
      });

      const path = await which('node');
      expect(path).toBe('/usr/bin/node');
      expect(mockAccess).not.toHaveBeenCalled();
    });

    it('skips known dirs when npm prefix succeeds (ordering guard)', async () => {
      mockPlatform.mockReturnValue('linux');
      process.env.npm_config_prefix = '/test/prefix';
      // PATH lookup fails
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('not found'), { stdout: '', stderr: '' });
        }
        return mockChildProcess;
      });
      // npm prefix has the binary
      mockAccess.mockResolvedValue(undefined);

      const path = await which('my-agent');
      expect(path).toBe(join('/test/prefix', 'bin', 'my-agent'));
      // Only one access call (npm prefix check), none for known dirs
      expect(mockAccess).toHaveBeenCalledTimes(1);
    });

    it('win32: finds binary in %APPDATA%\\npm', async () => {
      mockPlatform.mockReturnValue('win32');
      process.env.APPDATA = 'C:\\Users\\test\\AppData\\Roaming';
      process.env.LOCALAPPDATA = 'C:\\Users\\test\\AppData\\Local';
      process.env.USERPROFILE = 'C:\\Users\\test';
      // PATH and npm prefix both fail
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('not found'), { stdout: '', stderr: '' });
        }
        return mockChildProcess;
      });
      // npm prefix check fails (no prefix set)
      mockAccess.mockImplementation(async (p) => {
        if (String(p) === join('C:\\Users\\test\\AppData\\Roaming', 'npm', 'my-agent')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      const path = await which('my-agent');
      expect(path).toBe(join('C:\\Users\\test\\AppData\\Roaming', 'npm', 'my-agent'));
    });

    it('win32: finds binary in Volta\\bin when earlier dirs miss', async () => {
      mockPlatform.mockReturnValue('win32');
      process.env.APPDATA = 'C:\\Users\\test\\AppData\\Roaming';
      process.env.LOCALAPPDATA = 'C:\\Users\\test\\AppData\\Local';
      process.env.USERPROFILE = 'C:\\Users\\test';
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('not found'), { stdout: '', stderr: '' });
        }
        return mockChildProcess;
      });
      mockAccess.mockImplementation(async (p) => {
        const s = String(p);
        if (s === join('C:\\Users\\test\\AppData\\Local', 'Volta', 'bin', 'my-agent')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      const path = await which('my-agent');
      expect(path).toBe(join('C:\\Users\\test\\AppData\\Local', 'Volta', 'bin', 'my-agent'));
    });

    it('win32: skips directory when env var is unset', async () => {
      mockPlatform.mockReturnValue('win32');
      // Only APPDATA set — LOCALAPPDATA and USERPROFILE unset
      process.env.APPDATA = 'C:\\Users\\test\\AppData\\Roaming';
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('not found'), { stdout: '', stderr: '' });
        }
        return mockChildProcess;
      });
      // npm prefix check fails
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const path = await which('my-agent');
      expect(path).toBeNull();
      // No access call should contain 'undefined' in the path
      for (const call of mockAccess.mock.calls) {
        expect(String(call[0])).not.toContain('undefined');
      }
    });

    it('win32: finds .cmd shim in known dir when bare name missing', async () => {
      mockPlatform.mockReturnValue('win32');
      process.env.APPDATA = 'C:\\Users\\test\\AppData\\Roaming';
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('not found'), { stdout: '', stderr: '' });
        }
        return mockChildProcess;
      });
      mockAccess.mockImplementation(async (p) => {
        const s = String(p);
        if (s === join('C:\\Users\\test\\AppData\\Roaming', 'npm', 'my-agent.cmd')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      const path = await which('my-agent');
      expect(path).toBe(join('C:\\Users\\test\\AppData\\Roaming', 'npm', 'my-agent.cmd'));
    });

    it('win32: finds .exe shim when bare name and .cmd miss', async () => {
      mockPlatform.mockReturnValue('win32');
      process.env.APPDATA = 'C:\\Users\\test\\AppData\\Roaming';
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('not found'), { stdout: '', stderr: '' });
        }
        return mockChildProcess;
      });
      mockAccess.mockImplementation(async (p) => {
        const s = String(p);
        if (s === join('C:\\Users\\test\\AppData\\Roaming', 'npm', 'my-agent.exe')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      const path = await which('my-agent');
      expect(path).toBe(join('C:\\Users\\test\\AppData\\Roaming', 'npm', 'my-agent.exe'));
    });

    it('posix: finds binary in ~/.local/bin', async () => {
      mockPlatform.mockReturnValue('linux');
      process.env.HOME = '/home/test';
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('not found'), { stdout: '', stderr: '' });
        }
        return mockChildProcess;
      });
      mockAccess.mockImplementation(async (p) => {
        if (String(p) === join('/home/test', '.local', 'bin', 'my-agent')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      const path = await which('my-agent');
      expect(path).toBe(join('/home/test', '.local', 'bin', 'my-agent'));
    });

    it('posix: finds binary in /opt/homebrew/bin when ~/.local/bin misses', async () => {
      mockPlatform.mockReturnValue('linux');
      process.env.HOME = '/home/test';
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('not found'), { stdout: '', stderr: '' });
        }
        return mockChildProcess;
      });
      mockAccess.mockImplementation(async (p) => {
        if (String(p) === join('/opt/homebrew/bin', 'my-agent')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      const path = await which('my-agent');
      expect(path).toBe(join('/opt/homebrew/bin', 'my-agent'));
    });

    it('posix: falls back to os.homedir() when HOME is unset', async () => {
      mockPlatform.mockReturnValue('linux');
      mockHomedir.mockReturnValue('/fallback-home');
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('not found'), { stdout: '', stderr: '' });
        }
        return mockChildProcess;
      });
      mockAccess.mockImplementation(async (p) => {
        if (String(p) === join('/fallback-home', '.local', 'bin', 'my-agent')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      const path = await which('my-agent');
      expect(path).toBe(join('/fallback-home', '.local', 'bin', 'my-agent'));
    });

    it('returns null when everything misses', async () => {
      mockPlatform.mockReturnValue('linux');
      process.env.HOME = '/home/test';
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('not found'), { stdout: '', stderr: '' });
        }
        return mockChildProcess;
      });
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const path = await which('missing-agent');
      expect(path).toBeNull();
    });
  });
});

describe('getVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Pin to a non-win32 platform so existing tests are deterministic on every
    // CI runner; Windows shim behavior has dedicated tests below.
    mockPlatform.mockReturnValue('linux');
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

  it('strips trailing dot from version output', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: '1.0.76.\n', stderr: '' });
      }
      return mockChildProcess;
    });

    const version = await getVersion('copilot', ['--version']);
    expect(version).toBe('1.0.76');
  });

  it('falls back to stderr when stdout has no version', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: '', stderr: 'mytool v4.5.6\n' });
      }
      return mockChildProcess;
    });

    const version = await getVersion('mytool', ['--version']);
    expect(version).toBe('4.5.6');
  });

  it('adopts dotted number from stderr warning when stdout is empty', async () => {
    // Documented tradeoff: with no stdout version, a dotted number in a
    // stderr warning is adopted rather than returning undefined.
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: '', stderr: 'Warning: 9.9.9 deprecated\n' });
      }
      return mockChildProcess;
    });

    const version = await getVersion('mytool', ['--version']);
    expect(version).toBe('9.9.9');
  });

  it('prefers stdout over stderr when both have versions', async () => {
    // Regression guard: a dotted number in a stderr warning must not win.
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: 'v1.2.3\n', stderr: 'Warning: 9.9.9 deprecated\n' });
      }
      return mockChildProcess;
    });

    const version = await getVersion('mytool', ['--version']);
    expect(version).toBe('1.2.3');
  });

  it('returns raw stdout when neither stream has a version', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: 'some output\n', stderr: 'Warning: 404\n' });
      }
      return mockChildProcess;
    });

    const version = await getVersion('mytool', ['--version']);
    expect(version).toBe('some output');
  });

  describe('on win32', () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue('win32');
    });

    it('spawns .exe directly without a shell', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(null, { stdout: 'v3.2.1\n', stderr: '' });
        }
        return mockChildProcess;
      });

      const version = await getVersion('C:\\tools\\copilot.exe', ['--version']);
      expect(version).toBe('3.2.1');
      expect(mockExecFile).toHaveBeenCalledWith(
        'C:\\tools\\copilot.exe',
        ['--version'],
        expect.not.objectContaining({ shell: true }),
        expect.anything(),
      );
    });

    it('resolves npm .cmd shim and runs through the shell', async () => {
      // Only the .cmd shim exists (npm installs copilot, copilot.cmd).
      mockAccess.mockImplementation(async (p) => {
        if (String(p).endsWith('.cmd')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });
      mockExec.mockImplementation((_cmd, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(null, { stdout: 'v1.0.76\n', stderr: '' });
        }
        return mockChildProcess;
      });

      const version = await getVersion('C:\\Program Files\\nodejs\\copilot', ['--version']);
      expect(version).toBe('1.0.76');
      // exec() (not execFile) — single command string, no DEP0190, proper quoting
      expect(mockExec).toHaveBeenCalledWith(
        '"C:\\Program Files\\nodejs\\copilot.cmd" --version',
        expect.objectContaining({ timeout: 10_000 }),
        expect.anything(),
      );
      expect(mockExecFile).not.toHaveBeenCalled();
    });

    it('falls back to bare path when no shim exists', async () => {
      // No .cmd/.exe on disk; the bare launcher itself exists.
      mockAccess.mockImplementation(async (p) => {
        if (String(p).endsWith('.cmd') || String(p).endsWith('.exe')) {
          throw new Error('ENOENT');
        }
        return undefined;
      });
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(null, { stdout: 'v2.0.0\n', stderr: '' });
        }
        return mockChildProcess;
      });

      const version = await getVersion('C:\\bin\\mytool', []);
      expect(version).toBe('2.0.0');
      expect(mockExecFile).toHaveBeenCalledWith(
        'C:\\bin\\mytool',
        [],
        expect.not.objectContaining({ shell: true }),
        expect.anything(),
      );
    });

    it('returns null when no resolvable shim exists', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const version = await getVersion('C:\\missing\\tool', []);
      expect(version).toBeNull();
      expect(mockExecFile).not.toHaveBeenCalled();
    });
  });
});
