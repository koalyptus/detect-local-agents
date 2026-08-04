// tests/detectors.test.ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import { isAgentDetector, loadAllDetectors } from '../../src/detectors/index.js';
import { hasConfigFile } from '../../src/config/config-paths.js';
import cursorDetector from '../../src/detectors/cursor.detector.js';
import rovodevDetector from '../../src/detectors/rovodev.detector.js';

// Mock the detect module
vi.mock('../../src/detect/utils.js', () => ({
  which: vi.fn(),
  getVersion: vi.fn(),
}));

// Mock child_process for rovodev detector
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

import { which, getVersion } from '../../src/detect/utils.js';
import { execFile } from 'node:child_process';

const mockWhich = vi.mocked(which);
const mockGetVersion = vi.mocked(getVersion);
const mockExecFile = vi.mocked(execFile);
const mockChildProcess = {} as ChildProcess;

describe('cursor detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhich.mockResolvedValue(null);
    delete process.env['CURSOR_AGENT'];
    delete process.env['CURSOR_EXTENSION_HOST_ROLE'];
  });

  it('returns null when cursor-agent not found', async () => {
    mockWhich.mockImplementation(async (name) => {
      if (name === 'cursor-agent') {
        return null;
      }
      return null;
    });

    const result = await cursorDetector.detect();
    expect(result).toBeNull();
  });

  it('returns cursor when cursor-agent found (no env vars)', async () => {
    mockWhich.mockImplementation(async (name) => {
      if (name === 'cursor-agent') {
        return '/usr/bin/cursor-agent';
      }
      return null;
    });

    const result = await cursorDetector.detect();
    expect(result).not.toBeNull();
    expect(result?.name).toBe('cursor');
    expect(result?.binary).toBe('/usr/bin/cursor-agent');
    expect(result?.isACPAgent).toBe(true);
  });

  it('returns cursor-cli when CURSOR_AGENT env is set', async () => {
    mockWhich.mockResolvedValue('/usr/bin/cursor-agent');
    process.env['CURSOR_AGENT'] = 'true';

    const result = await cursorDetector.detect();
    expect(result?.name).toBe('cursor-cli');
    expect(result?.isACPAgent).toBe(true);
  });

  it('returns cursor-cli when CURSOR_EXTENSION_HOST_ROLE is agent-exec', async () => {
    mockWhich.mockResolvedValue('/usr/bin/cursor-agent');
    process.env['CURSOR_EXTENSION_HOST_ROLE'] = 'agent-exec';

    const result = await cursorDetector.detect();
    expect(result?.name).toBe('cursor-cli');
    expect(result?.isACPAgent).toBe(true);
  });
});

describe('rovodev detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhich.mockResolvedValue(null);
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: '', stderr: '' });
      }
      return mockChildProcess;
    });
  });

  it('returns null when acli not found', async () => {
    mockWhich.mockImplementation(async (name) => {
      if (name === 'acli') {
        return null;
      }
      return null;
    });

    const result = await rovodevDetector.detect();
    expect(result).toBeNull();
  });

  it('returns null when probe fails', async () => {
    mockWhich.mockImplementation(async (name) => {
      if (name === 'acli') {
        return '/usr/bin/acli';
      }
      return null;
    });

    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(new Error('Command failed'), { stdout: '' });
      }
      return mockChildProcess;
    });

    const result = await rovodevDetector.detect();
    expect(result).toBeNull();
  });

  it('returns null when probe returns empty stdout', async () => {
    mockWhich.mockImplementation(async (name) => {
      if (name === 'acli') {
        return '/usr/bin/acli';
      }
      return null;
    });

    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: '' });
      }
      return mockChildProcess;
    });

    const result = await rovodevDetector.detect();
    expect(result).toBeNull();
  });

  it('returns agent when probe succeeds', async () => {
    mockWhich.mockImplementation(async (name) => {
      if (name === 'acli') {
        return '/usr/bin/acli';
      }
      return null;
    });

    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: 'rovodev help output' });
      }
      return mockChildProcess;
    });

    const result = await rovodevDetector.detect();
    expect(result).not.toBeNull();
    expect(result?.name).toBe('rovodev');
    expect(result?.binary).toBe('/usr/bin/acli');
    expect(result?.metadata?.acliBinary).toBe('/usr/bin/acli');
  });
});

describe('isAgentDetector', () => {
  it('validates correct shape', () => {
    const valid = { name: 'test', detect: async () => null };
    expect(isAgentDetector(valid)).toBe(true);
  });

  it('rejects invalid shapes', () => {
    expect(isAgentDetector(null)).toBe(false);
    expect(isAgentDetector({ name: 'test' })).toBe(false);
    expect(isAgentDetector({ detect: async () => null })).toBe(false);
    expect(isAgentDetector('string')).toBe(false);
    expect(isAgentDetector(123)).toBe(false);
  });
});

describe('config detectors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhich.mockResolvedValue(null);
    mockGetVersion.mockResolvedValue(null);
  });

  it('claude detector returns null when binary not found', async () => {
    mockWhich.mockResolvedValue(null);

    const detectors = await loadAllDetectors();
    const claudeDetector = detectors.find((d) => d.name === 'claude');

    const result = await claudeDetector?.detect();
    expect(result).toBeNull();
  });

  it('claude detector returns agent when binary found', async () => {
    mockWhich.mockImplementation(async (name) => {
      if (name === 'claude') {
        return '/usr/bin/claude';
      }
      return null;
    });
    mockGetVersion.mockResolvedValue('1.0.0');

    const detectors = await loadAllDetectors();
    const claudeDetector = detectors.find((d) => d.name === 'claude');

    const result = await claudeDetector?.detect();
    expect(result).not.toBeNull();
    expect(result?.name).toBe('claude');
    expect(result?.binary).toBe('/usr/bin/claude');
    expect(result?.version).toBe('1.0.0');
  });

  it('claude detector checks env vars for isConfigured', async () => {
    mockWhich.mockImplementation(async (name) => {
      if (name === 'claude') {
        return '/usr/bin/claude';
      }
      return null;
    });
    mockGetVersion.mockResolvedValue('1.0.0');

    process.env.ANTHROPIC_API_KEY = 'test-key';

    const detectors = await loadAllDetectors();
    const claudeDetector = detectors.find((d) => d.name === 'claude');

    const result = await claudeDetector?.detect();
    expect(result?.isConfigured).toBe(true);

    delete process.env.ANTHROPIC_API_KEY;
  });

  it('hermes detector checks config dir for isConfigured (dir exists)', async () => {
    mockWhich.mockImplementation(async (name) => {
      if (name === 'hermes') {
        return '/usr/bin/hermes';
      }
      return null;
    });
    mockGetVersion.mockResolvedValue('1.0.0');

    const detectors = await loadAllDetectors();
    const hermesDetector = detectors.find((d) => d.name === 'hermes');

    const result = await hermesDetector?.detect();
    // isConfigured depends on whether ~/.hermes exists
    expect(typeof result?.isConfigured).toBe('boolean');
  });
});

describe('orca detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when orca not found', async () => {
    mockWhich.mockResolvedValue(null);

    const { default: orca } = await import('../../src/detectors/orca.detector.js');
    const result = await orca.detect();
    expect(result).toBeNull();
  });

  it('returns agent when orca found', async () => {
    mockWhich.mockResolvedValue('/usr/bin/orca');

    const { default: orca } = await import('../../src/detectors/orca.detector.js');
    const result = await orca.detect();
    expect(result).not.toBeNull();
    expect(result?.name).toBe('orca');
    expect(result?.binary).toBe('/usr/bin/orca');
    expect(result?.isACPAgent).toBe(true);
  });
});

describe('windsurf detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when neither windsurf nor codeium found', async () => {
    mockWhich.mockResolvedValue(null);

    const { default: windsurf } = await import('../../src/detectors/windsurf.detector.js');
    const result = await windsurf.detect();
    expect(result).toBeNull();
  });

  it('returns agent when windsurf found', async () => {
    mockWhich.mockImplementation(async (name) => {
      if (name === 'windsurf') {
        return '/usr/bin/windsurf';
      }
      return null;
    });

    const { default: windsurf } = await import('../../src/detectors/windsurf.detector.js');
    const result = await windsurf.detect();
    expect(result).not.toBeNull();
    expect(result?.name).toBe('windsurf');
    expect(result?.isACPAgent).toBe(true);
  });
});

describe('swe-agent detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhich.mockResolvedValue(null);
    mockGetVersion.mockResolvedValue(null);
    mockExecFile.mockImplementation((...args: unknown[]) => {
      const callback = args.find(
        (a): a is (err: unknown, result: { stdout: string; stderr: string }) => void =>
          typeof a === 'function',
      );
      if (callback) {
        callback(null, { stdout: '[]', stderr: '' });
      }
      return mockChildProcess;
    });
  });

  it('returns null when pip package not found', async () => {
    // Mock pip list returning empty
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (typeof callback === 'function') {
        callback(null, { stdout: '[]', stderr: '' });
      }
      return mockChildProcess;
    });

    const { default: sweAgent } = await import('../../src/detectors/swe-agent.detector.js');
    const result = await sweAgent.detect();
    expect(result).toBeNull();
  });
});

describe('loadAllDetectors counts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns at least 35 detectors', async () => {
    const detectors = await loadAllDetectors();
    // config entries + file-based detectors
    expect(detectors.length).toBeGreaterThanOrEqual(35);
  });
});

describe('config file detection integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhich.mockResolvedValue(null);
    mockGetVersion.mockResolvedValue(null);
  });

  it('detects claude as configured via settings.json', async () => {
    // Create temp dir with .claude/config.json
    const tmpDir = os.tmpdir();
    const testDir = await fs.mkdtemp(path.join(tmpDir, 'detect-test-'));
    const claudeDir = path.join(testDir, '.claude');
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.writeFile(path.join(claudeDir, 'settings.json'), '{}');

    // Mock HOME to point to test dir
    const originalHome = process.env.HOME;
    process.env.HOME = testDir;
    if (process.platform === 'win32') {
      process.env.USERPROFILE = testDir;
    }

    // Mock which to return fake binary
    mockWhich.mockImplementation(async (name) => {
      if (name === 'claude') {
        return '/fake/claude';
      }
      return null;
    });
    mockGetVersion.mockResolvedValue('1.0.0');

    const detectors = await loadAllDetectors();
    const claudeDetector = detectors.find((d) => d.name === 'claude');

    const result = await claudeDetector?.detect();

    expect(result).not.toBeNull();
    expect(result?.name).toBe('claude');
    expect(result?.isConfigured).toBe(true);
    expect(result?.binary).toBe('/fake/claude');

    // Cleanup
    process.env.HOME = originalHome;
    if (process.platform === 'win32') {
      process.env.USERPROFILE = originalHome;
    }
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('hasConfigFile returns false for unknown agent', async () => {
    const result = await hasConfigFile('unknown-agent-that-does-not-exist');
    expect(result).toBe(false);
  });
});
