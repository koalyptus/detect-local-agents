import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import { which, getVersion } from '../../src/detect/utils.js';
import { getPlatform } from '../../src/detect/platform.js';
import { exec, execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
  exec: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock('../../src/detect/platform.js', () => ({
  getPlatform: vi.fn(),
}));

const mockExecFile = vi.mocked(execFile);
const mockExec = vi.mocked(exec);
const mockAccess = vi.mocked(access);
const mockReadFile = vi.mocked(readFile);
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

    describe('PE version fallback', () => {
      it('reads version from PE binary when --version fails', async () => {
        mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
          if (typeof callback === 'function') {
            callback(new Error('not supported'), { stdout: '', stderr: '' });
          }
          return mockChildProcess;
        });

        // Build a minimal VS_VERSIONINFO buffer (as found inside PE .rsrc)
        // Layout: header(6) + szKey("VS_VERSION_INFO\0" in UTF-16LE = 34 bytes)
        //         + padding(0) + Value(VS_FIXEDFILEINFO = 52 bytes)
        const key = Buffer.from('VS_VERSION_INFO\0', 'utf16le'); // 34 bytes
        const headerLen = 6;
        const padding = (4 - ((headerLen + key.length) % 4)) % 4; // 0
        const valueOffset = headerLen + key.length + padding; // 40
        const totalLen = valueOffset + 52; // 94 bytes
        const buf = Buffer.alloc(128);
        // VS_VERSIONINFO header
        buf.writeUInt16LE(totalLen, 0); // wLength
        buf.writeUInt16LE(52, 2); // wValueLength = sizeof(VS_FIXEDFILEINFO)
        buf.writeUInt16LE(0, 4); // wType = 0 (binary)
        // szKey
        key.copy(buf, headerLen);
        // VS_FIXEDFILEINFO at valueOffset
        buf.writeUInt32LE(0xfeef04bd, valueOffset); // dwSignature
        // dwFileVersionMS at valueOffset+8: major=0, minor=32
        buf.writeUInt32LE((0 << 16) | 32, valueOffset + 8);
        // dwFileVersionLS at valueOffset+12: build=0, revision=0
        buf.writeUInt32LE(0, valueOffset + 12);

        mockReadFile.mockResolvedValue(buf);

        const version = await getVersion('C:\\test\\app.exe');
        expect(version).toBe('0.32');
      });

      it('parses 4-component version (build + revision)', async () => {
        mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
          if (typeof callback === 'function') {
            callback(new Error('not supported'), { stdout: '', stderr: '' });
          }
          return mockChildProcess;
        });

        const key = Buffer.from('VS_VERSION_INFO\0', 'utf16le');
        const headerLen = 6;
        const padding = (4 - ((headerLen + key.length) % 4)) % 4;
        const valueOffset = headerLen + key.length + padding;
        const buf = Buffer.alloc(128);
        buf.writeUInt16LE(0, 0);
        buf.writeUInt16LE(52, 2);
        buf.writeUInt16LE(0, 4);
        key.copy(buf, headerLen);
        // Signature
        buf.writeUInt32LE(0xfeef04bd, valueOffset);
        // fileVersionMS: major=1, minor=2
        buf.writeUInt32LE((1 << 16) | 2, valueOffset + 8);
        // fileVersionLS: build=3, revision=4
        buf.writeUInt32LE((3 << 16) | 4, valueOffset + 12);

        mockReadFile.mockResolvedValue(buf);

        const version = await getVersion('C:\\test\\app.exe');
        expect(version).toBe('1.2.3.4');
      });

      it('strips trailing zero build when revision is zero', async () => {
        mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
          if (typeof callback === 'function') {
            callback(new Error('not supported'), { stdout: '', stderr: '' });
          }
          return mockChildProcess;
        });

        const key = Buffer.from('VS_VERSION_INFO\0', 'utf16le');
        const headerLen = 6;
        const padding = (4 - ((headerLen + key.length) % 4)) % 4;
        const valueOffset = headerLen + key.length + padding;
        const buf = Buffer.alloc(128);
        buf.writeUInt16LE(0, 0);
        buf.writeUInt16LE(52, 2);
        buf.writeUInt16LE(0, 4);
        key.copy(buf, headerLen);
        buf.writeUInt32LE(0xfeef04bd, valueOffset);
        // fileVersionMS: major=0, minor=0
        buf.writeUInt32LE((0 << 16) | 0, valueOffset + 8);
        // fileVersionLS: build=32, revision=0
        buf.writeUInt32LE((32 << 16) | 0, valueOffset + 12);

        mockReadFile.mockResolvedValue(buf);

        const version = await getVersion('C:\\test\\app.exe');
        expect(version).toBe('0.0.32');
      });

      it('returns null when PE file has no version info', async () => {
        mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
          if (typeof callback === 'function') {
            callback(new Error('not supported'), { stdout: '', stderr: '' });
          }
          return mockChildProcess;
        });

        // Buffer without the PE version signature
        mockReadFile.mockResolvedValue(Buffer.alloc(128));

        const version = await getVersion('C:\\test\\app.exe');
        expect(version).toBeNull();
      });

      it('returns null when readFile throws', async () => {
        mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
          if (typeof callback === 'function') {
            callback(new Error('not supported'), { stdout: '', stderr: '' });
          }
          return mockChildProcess;
        });

        mockReadFile.mockRejectedValue(new Error('EACCES'));

        const version = await getVersion('C:\\test\\app.exe');
        expect(version).toBeNull();
      });

      it('does not use PE fallback on non-win32', async () => {
        mockPlatform.mockReturnValue('linux');
        mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
          if (typeof callback === 'function') {
            callback(new Error('not supported'), { stdout: '', stderr: '' });
          }
          return mockChildProcess;
        });

        const version = await getVersion('/usr/bin/app');
        expect(version).toBeNull();
        expect(mockReadFile).not.toHaveBeenCalled();
      });
    });
  });
});
