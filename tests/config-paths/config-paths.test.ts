// tests/config-paths/config-paths.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

import { hasConfigFile, getConfigPaths, resolveConfigPath } from '../../src/config-paths.js';

describe('config-paths', () => {
  let tempDir: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'config-paths-test-'));
    originalHome = process.env.HOME;
    process.env.HOME = tempDir;
    process.env.APPDATA = tempDir;
    process.env.USERPROFILE = tempDir;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (originalHome !== undefined) {
      process.env.HOME = originalHome;
    } else {
      delete process.env.HOME;
    }
    delete process.env.APPDATA;
    delete process.env.USERPROFILE;
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  describe('getConfigPaths', () => {
    it('returns paths for claude', () => {
      const paths = getConfigPaths('claude');
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.some((p) => p.includes('.claude/settings.json'))).toBe(true);
    });

    it('returns paths for codex', () => {
      const paths = getConfigPaths('codex');
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.some((p) => p.includes('.codex/config.json'))).toBe(true);
    });

    it('returns paths for opencode', () => {
      const paths = getConfigPaths('opencode');
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.some((p) => p.includes('opencode/config.json'))).toBe(true);
    });

    it('returns paths for hermes', () => {
      const paths = getConfigPaths('hermes');
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.some((p) => p.includes('.hermes/config.json'))).toBe(true);
    });

    it('returns empty array for unknown agent', () => {
      const paths = getConfigPaths('unknown-agent');
      expect(paths).toEqual([]);
    });

    it('returns paths for gemini', () => {
      const paths = getConfigPaths('gemini');
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.some((p) => p.includes('.gemini/config.json'))).toBe(true);
    });
  });

  describe('resolveConfigPath', () => {
    it('resolves ~ paths', () => {
      const resolved = resolveConfigPath('~/.claude/settings.json');
      expect(resolved).toBe(path.join(os.homedir(), '.claude/settings.json'));
    });

    it('resolves %APPDATA% paths', () => {
      const originalAppData = process.env.APPDATA;
      process.env.APPDATA = '/custom/appdata';
      const resolved = resolveConfigPath('%APPDATA%/Claude/settings.json');
      expect(resolved).toBe(path.join('/custom/appdata', 'Claude/settings.json'));
      if (originalAppData !== undefined) {
        process.env.APPDATA = originalAppData;
      } else {
        delete process.env.APPDATA;
      }
    });

    it('resolves %USERPROFILE% paths', () => {
      const originalUserProfile = process.env.USERPROFILE;
      process.env.USERPROFILE = '/custom/profile';
      const resolved = resolveConfigPath('%USERPROFILE%/.claude/settings.json');
      expect(resolved).toBe(path.join('/custom/profile', '.claude/settings.json'));
      if (originalUserProfile !== undefined) {
        process.env.USERPROFILE = originalUserProfile;
      } else {
        delete process.env.USERPROFILE;
      }
    });

    it('resolves %APPDATA% with fallback when APPDATA unset', () => {
      const originalAppData = process.env.APPDATA;
      delete process.env.APPDATA;
      const resolved = resolveConfigPath('%APPDATA%/Claude/settings.json');
      const expectedBase = path.join(os.homedir(), 'AppData', 'Roaming');
      expect(resolved).toBe(path.join(expectedBase, 'Claude/settings.json'));
      if (originalAppData !== undefined) {
        process.env.APPDATA = originalAppData;
      } else {
        delete process.env.APPDATA;
      }
    });

    it('resolves %USERPROFILE% with fallback when USERPROFILE unset', () => {
      const originalUserProfile = process.env.USERPROFILE;
      delete process.env.USERPROFILE;
      const resolved = resolveConfigPath('%USERPROFILE%/.claude/settings.json');
      expect(resolved).toBe(path.join(os.homedir(), '.claude/settings.json'));
      if (originalUserProfile !== undefined) {
        process.env.USERPROFILE = originalUserProfile;
      } else {
        delete process.env.USERPROFILE;
      }
    });
  });

  describe('hasConfigFile', () => {
    let tempDir: string;
    let originalHome: string | undefined;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'config-paths-test-'));
      originalHome = process.env.HOME;
      process.env.HOME = tempDir;
      process.env.APPDATA = tempDir;
      process.env.USERPROFILE = tempDir;
      vi.clearAllMocks();
    });

    afterEach(async () => {
      if (originalHome !== undefined) {
        process.env.HOME = originalHome;
      } else {
        delete process.env.HOME;
      }
      delete process.env.APPDATA;
      delete process.env.USERPROFILE;
      await fs.rm(tempDir, { recursive: true, force: true });
      vi.clearAllMocks();
    });

    it('returns true when claude settings.json exists', async () => {
      const claudeDir = path.join(tempDir, '.claude');
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(path.join(claudeDir, 'settings.json'), '{}');

      const result = await hasConfigFile('claude');
      expect(result).toBe(true);
    });

    it('returns false when claude settings.json is missing', async () => {
      const result = await hasConfigFile('claude');
      expect(result).toBe(false);
    });

    it('returns true when codex config.json exists', async () => {
      const codexDir = path.join(tempDir, '.codex');
      await fs.mkdir(codexDir, { recursive: true });
      await fs.writeFile(path.join(codexDir, 'config.json'), '{}');

      const result = await hasConfigFile('codex');
      expect(result).toBe(true);
    });

    it('returns false for unknown agent', async () => {
      const result = await hasConfigFile('unknown-agent');
      expect(result).toBe(false);
    });

    it('resolves %APPDATA% paths on Windows', async () => {
      // Skip - Windows-specific path resolution test
      // Cannot properly test Windows path resolution on Linux/WSL
      return;
    });

    it('resolves %USERPROFILE% paths on Windows for claude', async () => {
      if (process.platform !== 'win32') {
        return;
      }
      const customUserProfile = path.join(tempDir, 'CustomUserProfile');
      await fs.mkdir(customUserProfile, { recursive: true });
      const claudeDir = path.join(customUserProfile, '.claude');
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(path.join(claudeDir, 'settings.json'), '{}');

      const oldUserProfile = process.env.USERPROFILE;
      process.env.USERPROFILE = customUserProfile;
      const oldAppData = process.env.APPDATA;
      delete process.env.APPDATA;

      const result = await hasConfigFile('claude');
      expect(result).toBe(true);

      if (oldUserProfile !== undefined) {
        process.env.USERPROFILE = oldUserProfile;
      } else {
        delete process.env.USERPROFILE;
      }
      if (oldAppData !== undefined) {
        process.env.APPDATA = oldAppData;
      } else {
        delete process.env.APPDATA;
      }
    });
  });
});
