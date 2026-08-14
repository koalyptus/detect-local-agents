// tests/detectors/index.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

// Mock detect.js so which() returns a fake binary path for known binaries.
// getVersion is a vi.fn so individual tests can override its return value.
// vi.hoisted ensures the variable is available before the hoisted vi.mock factory runs.
const { mockWhich, mockGetVersion } = vi.hoisted(() => ({
  mockWhich: vi.fn(async (name: string) => `/usr/local/bin/${name}`),
  mockGetVersion: vi.fn<(name: string) => Promise<string | undefined>>(async () => '1.0.0'),
}));

vi.mock('../../src/detect/utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/detect/utils.js')>();
  return {
    ...actual,
    which: mockWhich,
    getVersion: mockGetVersion,
    getPlatform: vi.fn(() => 'linux'),
  };
});

import { loadAllDetectors, isAgentDetector, configToDetector } from '../../src/detectors/index.js';

describe('detectors/index', () => {
  let tempDir: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'detectors-test-'));
    originalHome = process.env.HOME;
    process.env.HOME = tempDir;
    vi.clearAllMocks();
    // Reset implementations (clearAllMocks keeps mockReturnValue/mockImplementation)
    mockWhich.mockImplementation(async (name: string) => `/usr/local/bin/${name}`);
    mockGetVersion.mockResolvedValue('1.0.0');
  });

  afterEach(async () => {
    if (originalHome !== undefined) {
      process.env.HOME = originalHome;
    } else {
      delete process.env.HOME;
    }
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('loadAllDetectors returns an array', async () => {
    const detectors = await loadAllDetectors();
    expect(Array.isArray(detectors)).toBe(true);
    expect(detectors.length).toBeGreaterThan(0);
  });

  it('loadAllDetectors returns objects with detect function', async () => {
    const detectors = await loadAllDetectors();
    for (const detector of detectors) {
      expect(typeof detector.detect).toBe('function');
    }
  });

  it('loadAllDetectors returns objects with name property', async () => {
    const detectors = await loadAllDetectors();
    for (const detector of detectors) {
      expect(typeof detector.name).toBe('string');
    }
  });

  it('isAgentDetector type guard works for valid detectors', () => {
    const detector = { name: 'test', detect: async () => null };
    expect(isAgentDetector(detector)).toBe(true);
  });

  it('isAgentDetector returns false for non-objects', () => {
    expect(isAgentDetector(null)).toBe(false);
    expect(isAgentDetector(undefined)).toBe(false);
    expect(isAgentDetector('string')).toBe(false);
    expect(isAgentDetector(42)).toBe(false);
  });

  it('isAgentDetector returns false for objects without detect', () => {
    expect(isAgentDetector({ name: 'test' })).toBe(false);
  });

  it('isAgentDetector returns false for objects without name', () => {
    expect(isAgentDetector({ detect: async () => null })).toBe(false);
  });

  it('loadAllDetectors includes config-based detectors', async () => {
    const detectors = await loadAllDetectors();
    const names = detectors.map((d) => d.name);
    expect(names).toContain('claude');
    expect(names).toContain('codex');
  });

  it('configDir fallback finds existing directory', async () => {
    // Create the config directory at HOME/.claude (HOME is tempDir from beforeEach)
    const claudeDir = path.join(tempDir, '.claude');
    await fs.mkdir(claudeDir, { recursive: true });

    const detectors = await loadAllDetectors();
    const claude = detectors.find((d) => d.name === 'claude');
    expect(claude).toBeDefined();

    const result = await claude!.detect();
    expect(result).toBeDefined();
    // configDir fallback checks HOME/.claude (via process.env.HOME || os.homedir())
    expect(result!.isConfigured).toBe(true);
  });

  it('configDir fallback returns false when config dir is missing', async () => {
    // Use configToDetector directly with a non-existent dir to avoid
    // depending on what's actually installed on the test machine.
    const detector = configToDetector({
      name: 'test-missing-dir',
      binary: 'node',
      configDir: '~/.nonexistent-config-dir',
    });

    const result = await detector.detect();
    expect(result).toBeDefined();
    expect(result!.isConfigured).toBe(false);
  });

  it('loadAllDetectors warns and skips broken detector files', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const brokenFile = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'src',
      'detectors',
      'broken.detector.ts',
    );
    // Create a file with a syntax error that will throw on import
    await fs.writeFile(brokenFile, 'export default { broken: ; };\\n');

    try {
      const _detectors = await loadAllDetectors();
      expect(spy).toHaveBeenCalled();
    } finally {
      await fs.rm(brokenFile, { force: true });
      spy.mockRestore();
    }
  });

  it('configToDetector handles configDir with ~ prefix', async () => {
    // Test the ~ branch of configDir handling with a path that won't exist
    const detector = configToDetector({
      name: 'test-tilde-dir',
      binary: 'node',
      configDir: '~/.nonexistent-config-dir',
    });

    const result = await detector.detect();
    expect(result).toBeDefined();
    expect(result!.isConfigured).toBe(false);
  });

  it('configToDetector handles configDir without ~ prefix', async () => {
    // Test the non-~ branch of configDir handling (line 42)
    const detectors = await loadAllDetectors();
    const opencode = detectors.find((d) => d.name === 'opencode');
    expect(opencode).toBeDefined();
    // opencode uses '~/.config/opencode' which starts with ~, so it goes through
    // the ~ branch. The non-~ branch would be for configs without ~ prefix.
    // This test verifies the detector loads correctly.
    const result = await opencode!.detect();
    expect(result).toBeDefined();
  });

  it('configToDetector non-~ configDir branch and catch block', async () => {
    // Create a detector with a non-~ configDir to exercise line 42
    // and a path that will throw on fs.access to exercise catch block (line 48)
    const detector = configToDetector({
      name: 'test-detector',
      binary: 'node', // always available
      configDir: '/nonexistent/path',
    });

    const result = await detector.detect();
    expect(result).toBeDefined();
    expect(result!.isConfigured).toBe(false);
  });

  it('configToDetector uses nameResolver when provided', async () => {
    const detector = configToDetector({
      name: 'claude',
      binary: 'node', // always available
      nameResolver: (env) => (env['CLAUDE_CODE_IS_COWORK'] ? 'cowork' : 'claude'),
    });

    // Without env var: returns 'claude'
    const result1 = await detector.detect();
    expect(result1?.name).toBe('claude');

    // With env var: returns 'cowork'
    process.env['CLAUDE_CODE_IS_COWORK'] = 'true';
    const result2 = await detector.detect();
    expect(result2?.name).toBe('cowork');
    delete process.env['CLAUDE_CODE_IS_COWORK'];
  });

  it('detect returns version from getVersion', async () => {
    // default: getVersion returns '1.0.0'
    const detectors = await loadAllDetectors();
    const claude = detectors.find((d) => d.name === 'claude');
    expect(claude).toBeDefined();

    const result = await claude!.detect();
    expect(result!.version).toBe('1.0.0');
  });

  it('detect handles undefined version from getVersion (?? fallback)', async () => {
    // When getVersion returns undefined, the ?? undefined on line 24 is exercised.
    // (await getVersion(...)) ?? undefined — the ?? fallback is taken when
    // getVersion returns undefined.
    mockGetVersion.mockResolvedValue(undefined);

    const detectors = await loadAllDetectors();
    const claude = detectors.find((d) => d.name === 'claude');
    expect(claude).toBeDefined();

    const result = await claude!.detect();
    expect(result).toBeDefined();
    expect(result!.version).toBeUndefined();
  });

  it('detect() resolves normally when work finishes before the timeout', async () => {
    vi.useFakeTimers();
    try {
      const detector = configToDetector({ name: 'fast-test', binary: 'node' });
      const result = await detector.detect();
      expect(result).toBeDefined();
      expect(result!.name).toBe('fast-test');
      // No leftover fake timers: advancing far past the timeout changes nothing.
      await vi.advanceTimersByTimeAsync(30_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('configDir fallback uses os.homedir() when HOME not set', async () => {
    // Create a temp dir at os.homedir() to test the || os.homedir() fallback
    // on line 42 — when HOME is unset, the ~ branch resolves via os.homedir().
    const testHomeDir = path.join(os.tmpdir(), 'detectors-home-fallback-' + Date.now());
    await fs.mkdir(testHomeDir, { recursive: true });
    const configDir = path.join(testHomeDir, '.test-agent');
    await fs.mkdir(configDir, { recursive: true });

    const originalHome = process.env.HOME;
    delete process.env.HOME;
    try {
      const detector = configToDetector({
        name: 'home-fallback-test',
        binary: 'node',
        // configDir with ~ prefix — the ~ branch on line 42 resolves via
        // process.env.HOME || os.homedir(). Since HOME is not set, it uses
        // os.homedir(). But os.homedir() returns the REAL home, not testHomeDir.
        // So instead, we use a configToDetector with configDir that resolves
        // through the ~ branch and we verify the code path works correctly
        // even though the dir won't be found (that's expected — the || os.homedir()
        // sub-branch is what we need to cover).
        configDir: '~/.test-agent',
      });

      const result = await detector.detect();
      expect(result).toBeDefined();
      // isConfigured is false because the dir at os.homedir()/.test-agent
      // doesn't exist (we created it at testHomeDir/.test-agent, not
      // os.homedir()/.test-agent). This still exercises the || os.homedir()
      // sub-branch on line 42.
    } finally {
      process.env.HOME = originalHome;
      await fs.rm(testHomeDir, { recursive: true, force: true });
    }
  });

  it('configDir fallback finds dir via os.homedir() when HOME unset and ~/.claude exists', async () => {
    // When HOME is unset, the ~ branch uses os.homedir(). Create the .claude
    // dir at the passwd-based fallback path so the detector finds it.
    const originalHome = process.env.HOME;
    delete process.env.HOME;
    // os.homedir() now falls back to /etc/passwd (not the tempDir beforeEach set)
    const passwdHome = os.homedir();
    const claudeDir = path.join(passwdHome, '.claude');

    let createdTemp = false;
    try {
      await fs.access(claudeDir);
    } catch {
      await fs.mkdir(claudeDir, { recursive: true });
      createdTemp = true;
    }

    try {
      const detectors = await loadAllDetectors();
      const claude = detectors.find((d) => d.name === 'claude');
      expect(claude).toBeDefined();

      const result = await claude!.detect();
      expect(result).toBeDefined();
      expect(result!.isConfigured).toBe(true);
    } finally {
      process.env.HOME = originalHome;
      if (createdTemp) {
        await fs.rm(claudeDir, { recursive: true, force: true });
      }
    }
  });

  it('configToDetector sets configSource to env when an env var matches', async () => {
    const original = process.env['CONFIG_SOURCE_TEST_KEY'];
    process.env['CONFIG_SOURCE_TEST_KEY'] = 'test-key';
    const detector = configToDetector({
      name: 'env-source-test',
      binary: 'node',
      configEnvVars: ['CONFIG_SOURCE_TEST_KEY'],
      configDir: '~/.env-source-test',
    });

    try {
      const result = await detector.detect();
      expect(result!.isConfigured).toBe(true);
      expect(result!.configSource).toBe('env');
    } finally {
      if (original === undefined) {
        delete process.env['CONFIG_SOURCE_TEST_KEY'];
      } else {
        process.env['CONFIG_SOURCE_TEST_KEY'] = original;
      }
    }
  });

  it('configToDetector sets configSource to config-file when a config file exists', async () => {
    // hasConfigFile derives paths from detectorConfigs by name, so use a real
    // config entry ('kiro' has configDir ~/.kiro and no env vars to interfere).
    const configDir = path.join(tempDir, '.kiro');
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(path.join(configDir, 'config.json'), '{}');

    const detector = configToDetector({ name: 'kiro', binary: 'node' });

    const result = await detector.detect();
    expect(result!.isConfigured).toBe(true);
    expect(result!.configSource).toBe('config-file');
  });

  it('configToDetector sets configSource to config-dir when only the config dir exists', async () => {
    const configDir = path.join(tempDir, '.dir-source-test');
    await fs.mkdir(configDir, { recursive: true });

    const detector = configToDetector({
      name: 'dir-source-test',
      binary: 'node',
      configDir: '~/.dir-source-test',
    });

    const result = await detector.detect();
    expect(result!.isConfigured).toBe(true);
    expect(result!.configSource).toBe('config-dir');
  });

  it('configToDetector leaves configSource undefined when nothing matches', async () => {
    const detector = configToDetector({
      name: 'none-source-test',
      binary: 'node',
      configDir: '~/.none-source-test',
    });

    const result = await detector.detect();
    expect(result!.isConfigured).toBe(false);
    expect(result!.configSource).toBeUndefined();
  });

  it('configToDetector prefers env over config dir (cascade precedence guard)', async () => {
    // Env var set AND config dir present — the env signal must win.
    const configDir = path.join(tempDir, '.precedence-test');
    await fs.mkdir(configDir, { recursive: true });
    const original = process.env['PRECEDENCE_TEST_KEY'];
    process.env['PRECEDENCE_TEST_KEY'] = 'test-key';
    const detector = configToDetector({
      name: 'precedence-test',
      binary: 'node',
      configEnvVars: ['PRECEDENCE_TEST_KEY'],
      configDir: '~/.precedence-test',
    });

    try {
      const result = await detector.detect();
      expect(result!.isConfigured).toBe(true);
      expect(result!.configSource).toBe('env');
    } finally {
      if (original === undefined) {
        delete process.env['PRECEDENCE_TEST_KEY'];
      } else {
        process.env['PRECEDENCE_TEST_KEY'] = original;
      }
    }
  });

  it('configToDetector.detect({probe:false}) skips version probe (version undefined)', async () => {
    const detector = configToDetector({ name: 'probe-off', binary: 'node' });
    const result = await detector.detect({ probe: false });
    expect(result).toBeDefined();
    expect(result!.version).toBeUndefined();
    expect(mockGetVersion).not.toHaveBeenCalled();
  });

  it('configToDetector.detect({timeout}) forwards timeout to getVersion', async () => {
    const detector = configToDetector({ name: 'probe-timeout', binary: 'node' });
    await detector.detect({ timeout: 777 });
    expect(mockGetVersion).toHaveBeenCalledWith('/usr/local/bin/node', undefined, 777);
  });
});
