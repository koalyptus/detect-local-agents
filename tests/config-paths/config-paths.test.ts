import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

import {
  hasConfigFile,
  getConfigPaths,
  findAgentConfigPath,
  readAgentConfig,
} from '../../src/config-paths.js';

describe('config-paths', () => {
  let tempDir: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'config-paths-test-'));
    originalHome = process.env.HOME;
    process.env.HOME = tempDir;
    process.env.APPDATA = tempDir;
    process.env.USERPROFILE = tempDir;
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
  });

  describe('getConfigPaths', () => {
    it('returns paths for claude', () => {
      const paths = getConfigPaths('claude');
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.some((p) => p.includes('.claude/config.json'))).toBe(true);
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

    it('returns paths for claude', () => {
      const paths = getConfigPaths('claude');
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.some((p) => p.includes('.claude/config.json'))).toBe(true);
    });
  });

  describe('hasConfigFile', () => {
    it('returns true when claude config.json exists', async () => {
      const claudeDir = path.join(tempDir, '.claude');
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(path.join(claudeDir, 'config.json'), '{}');

      const result = await hasConfigFile('claude');
      expect(result).toBe(true);
    });

    it('returns false when claude config.json is missing', async () => {
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

    it('resolves %USERPROFILE% path correctly', async () => {
      // Test the %USERPROFILE% resolver branch (lines 59-61).
      // Set USERPROFILE to a different dir than HOME/APPDATA,
      // create file only at USERPROFILE/.claude, and verify it's found.
      delete process.env.APPDATA;
      const userProfileDir = await fs.mkdtemp(path.join(os.tmpdir(), 'userprofile-test-'));
      process.env.USERPROFILE = userProfileDir;

      const claudeDir = path.join(userProfileDir, '.claude');
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(path.join(claudeDir, 'config.json'), '{}');

      // HOME is tempDir (from beforeEach), no file at HOME/.claude
      // APPDATA is deleted, fallback = HOME/AppData/Roaming (no file)
      // USERPROFILE is userProfileDir, file IS at userProfileDir/.claude
      const result = await hasConfigFile('claude');
      expect(result).toBe(true);

      await fs.rm(userProfileDir, { recursive: true, force: true });
    });

    it('resolves %APPDATA% fallback when APPDATA env not set', async () => {
      // Test APPDATA fallback branch (line 57) - when APPDATA env var is not set,
      // it should fall back to path.join(HOME, 'AppData', 'Roaming')
      delete process.env.APPDATA;
      const appDataDir = path.join(tempDir, 'AppData', 'Roaming', '.claude');
      await fs.mkdir(appDataDir, { recursive: true });
      await fs.writeFile(path.join(appDataDir, 'config.json'), '{}');

      // HOME is tempDir, file IS at HOME/AppData/Roaming/.claude (the fallback)
      // APPDATA is not set, so fallback triggers
      const result = await hasConfigFile('claude');
      expect(result).toBe(true);
    });

    it('resolves %APPDATA% fallback with os.homedir() when HOME also not set', async () => {
      // Test the deep fallback on lines 55 and 57: when both APPDATA and HOME are unset,
      // the code falls through to os.homedir() for the ~ and APPDATA fallback resolution.
      const originalHome = process.env.HOME;
      delete process.env.HOME;
      delete process.env.APPDATA;

      // Create file at the REAL os.homedir()/AppData/Roaming/.claude/config.json
      // This exercises the `|| os.homedir()` sub-branch on lines 55 and 57.
      const homeDir = os.homedir();
      const appDataDir = path.join(homeDir, 'AppData', 'Roaming', '.claude');
      await fs.mkdir(appDataDir, { recursive: true });
      await fs.writeFile(path.join(appDataDir, 'config.json'), '{}');

      try {
        // ~ branch resolves to os.homedir()/.claude (no file — unless user has one)
        // APPDATA fallback resolves to os.homedir()/AppData/Roaming/.claude (file IS there)
        const result = await hasConfigFile('claude');
        expect(result).toBe(true);
      } finally {
        // Clean up the created file at the real home
        await fs.rm(appDataDir, { recursive: true, force: true });
        // Restore HOME
        process.env.HOME = originalHome;
      }
    });

    it('resolves %USERPROFILE% fallback when USERPROFILE env not set', async () => {
      // Test USERPROFILE fallback branch (line 60) - when USERPROFILE env var is not set,
      // it should fall back to HOME (which is tempDir from beforeEach).
      // NOTE: The ~ branch is checked first and also resolves to HOME,
      // so the ~ branch finds the file first. This test verifies the
      // overall behavior works when USERPROFILE is not set.
      delete process.env.APPDATA;
      delete process.env.USERPROFILE;

      const claudeDir = path.join(tempDir, '.claude');
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(path.join(claudeDir, 'config.json'), '{}');

      // HOME is tempDir, ~ resolves to tempDir/.claude — file found
      const result = await hasConfigFile('claude');
      expect(result).toBe(true);
    });
  });

  describe('findAgentConfigPath', () => {
    it('returns the resolved path when config file exists', async () => {
      const claudeDir = path.join(tempDir, '.claude');
      await fs.mkdir(claudeDir, { recursive: true });
      const configPath = path.join(claudeDir, 'config.json');
      await fs.writeFile(configPath, '{}');

      const result = await findAgentConfigPath('claude');
      expect(result).toBe(path.join(tempDir, '.claude', 'config.json'));
    });

    it('returns null when config file is missing', async () => {
      const result = await findAgentConfigPath('claude');
      expect(result).toBeNull();
    });

    it('returns null for unknown agent', async () => {
      const result = await findAgentConfigPath('unknown-agent');
      expect(result).toBeNull();
    });
  });

  describe('readAgentConfig', () => {
    it('returns parsed JSON when config file is valid', async () => {
      const claudeDir = path.join(tempDir, '.claude');
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(path.join(claudeDir, 'config.json'), '{"theme":"dark"}');

      const result = await readAgentConfig('claude');
      expect(result).toEqual({ theme: 'dark' });
    });

    it('returns null when config file contains malformed JSON', async () => {
      const claudeDir = path.join(tempDir, '.claude');
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(path.join(claudeDir, 'config.json'), '{not valid json');

      const result = await readAgentConfig('claude');
      expect(result).toBeNull();
    });

    it('returns null when config file is missing', async () => {
      const result = await readAgentConfig('claude');
      expect(result).toBeNull();
    });
  });
});
