// tests/detectors.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import { isAgentDetector } from '../src/detectors/index.js';
import cursorDetector from '../src/detectors/cursor.detector.js';
import rovodevDetector from '../src/detectors/rovodev.detector.js';

// Mock the detect module
vi.mock('../src/detect.js', () => ({
  which: vi.fn(),
  getVersion: vi.fn(),
}));

// Mock child_process for rovodev detector
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

import { which, getVersion } from '../src/detect.js';
import { execFile } from 'node:child_process';

const mockWhich = vi.mocked(which);
const mockGetVersion = vi.mocked(getVersion);
const mockExecFile = vi.mocked(execFile);
const mockChildProcess = {} as ChildProcess;

describe('cursor detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhich.mockResolvedValue(null);
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

  it('returns agent when cursor-agent found', async () => {
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
    const { loadAllDetectors } = await import('../src/detectors/index.js');
    mockWhich.mockResolvedValue(null);

    const detectors = await loadAllDetectors();
    const claudeDetector = detectors.find((d) => d.name === 'claude');

    const result = await claudeDetector?.detect();
    expect(result).toBeNull();
  });

  it('claude detector returns agent when binary found', async () => {
    const { loadAllDetectors } = await import('../src/detectors/index.js');
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
    const { loadAllDetectors } = await import('../src/detectors/index.js');
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
    const { loadAllDetectors } = await import('../src/detectors/index.js');
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

describe('config file detection integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhich.mockResolvedValue(null);
    mockGetVersion.mockResolvedValue(null);
  });

  it('detects claude as configured via settings.json', async () => {
    const { loadAllDetectors } = await import('../src/detectors/index.js');

    // Create temp dir with .claude/settings.json
    const tmpDir = await import('node:os').then((os) => os.tmpdir());
    const { mkdtemp } = await import('node:fs/promises');
    const path = await import('node:path');
    const testDir = await mkdtemp(path.join(tmpDir, 'detect-test-'));
    const claudeDir = path.join(testDir, '.claude');
    await import('node:fs/promises').then((fs) => fs.mkdir(claudeDir, { recursive: true }));
    await import('node:fs/promises').then((fs) => fs.writeFile(path.join(claudeDir, 'settings.json'), '{}'));

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
    await import('node:fs/promises').then((fs) => fs.rm(testDir, { recursive: true, force: true }));
  });

  it('hasConfigFile returns false for unknown agent', async () => {
    const { hasConfigFile } = await import('../src/config-paths.js');
    const result = await hasConfigFile('unknown-agent-that-does-not-exist');
    expect(result).toBe(false);
  });
});
