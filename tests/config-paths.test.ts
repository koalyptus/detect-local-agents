// tests/config-paths.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

import { AGENT_CONFIGS, hasConfigFile } from '../src/config-paths.js';

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

  describe('AGENT_CONFIGS', () => {
    it('includes claude with correct paths', () => {
      expect(AGENT_CONFIGS.claude).toBeDefined();
      expect(AGENT_CONFIGS.claude.name).toBe('claude');
      expect(AGENT_CONFIGS.claude.paths).toContainEqual(
        expect.stringContaining('.claude/settings.json'),
      );
    });

    it('includes codex with correct paths', () => {
      expect(AGENT_CONFIGS.codex).toBeDefined();
      expect(AGENT_CONFIGS.codex.name).toBe('codex');
      expect(AGENT_CONFIGS.codex.paths).toContainEqual(
        expect.stringContaining('.codex/config.json'),
      );
    });

    it('includes opencode with correct paths', () => {
      expect(AGENT_CONFIGS.opencode).toBeDefined();
      expect(AGENT_CONFIGS.opencode.name).toBe('opencode');
      expect(AGENT_CONFIGS.opencode.paths).toContainEqual(
        expect.stringContaining('opencode/config.json'),
      );
    });

    it('includes gemini with correct paths', () => {
      expect(AGENT_CONFIGS.gemini).toBeDefined();
      expect(AGENT_CONFIGS.gemini.name).toBe('gemini');
      expect(AGENT_CONFIGS.gemini.paths).toContainEqual(
        expect.stringContaining('.gemini/config.json'),
      );
    });
  });

  describe('hasConfigFile', () => {
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
      // Test the %APPDATA% resolution branch
      const customAppData = path.join(tempDir, 'CustomAppData');
      await fs.mkdir(customAppData, { recursive: true });
      const claudeDir = path.join(customAppData, 'Claude');
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(path.join(claudeDir, 'settings.json'), '{}');

      // Temporarily override APPDATA
      const oldAppData = process.env.APPDATA;
      process.env.APPDATA = customAppData;

      const result = await hasConfigFile('claude');
      expect(result).toBe(true);

      if (oldAppData !== undefined) {
        process.env.APPDATA = oldAppData;
      } else {
        delete process.env.APPDATA;
      }
    });

    it('resolves %USERPROFILE% paths on Windows for claude', async () => {
      // Test the %USERPROFILE% resolution branch
      const customUserProfile = path.join(tempDir, 'CustomUserProfile');
      await fs.mkdir(customUserProfile, { recursive: true });
      const claudeDir = path.join(customUserProfile, '.claude');
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(path.join(claudeDir, 'settings.json'), '{}');

      // Temporarily override USERPROFILE
      const oldUserProfile = process.env.USERPROFILE;
      process.env.USERPROFILE = customUserProfile;
      // Also clear APPDATA to force %USERPROFILE% branch
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
      }
    });

    it('resolves %USERPROFILE% paths on Windows for gemini', async () => {
      // Test the %USERPROFILE% resolution branch
      const customProfile = path.join(tempDir, 'CustomProfile');
      await fs.mkdir(customProfile, { recursive: true });
      const geminiDir = path.join(customProfile, '.gemini');
      await fs.mkdir(geminiDir, { recursive: true });
      await fs.writeFile(path.join(geminiDir, 'config.json'), '{}');

      const oldUserProfile = process.env.USERPROFILE;
      process.env.USERPROFILE = customProfile;

      const result = await hasConfigFile('gemini');
      expect(result).toBe(true);

      if (oldUserProfile !== undefined) {
        process.env.USERPROFILE = oldUserProfile;
      } else {
        delete process.env.USERPROFILE;
      }
    });
  });
});
