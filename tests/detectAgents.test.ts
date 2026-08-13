import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectAgents } from '../src/index.js';
import type { DetectOptions, AgentDetector } from '../src/types.js';
import { which, getVersion } from '../src/detect/utils.js';

// Mock the detect module
vi.mock('../src/detect/utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/detect/utils.js')>();
  return {
    ...actual,
    which: vi.fn(),
    getVersion: vi.fn(),
  };
});

// Mock the detectors/index to control loaded detectors
vi.mock('../src/detectors/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/detectors/index.js')>();
  return {
    ...actual,
    loadAllDetectors: vi.fn(),
  };
});

import { loadAllDetectors } from '../src/detectors/index.js';

const mockWhich = vi.mocked(which);
const mockGetVersion = vi.mocked(getVersion);
const mockLoadAllDetectors = vi.mocked(loadAllDetectors);

describe('detectAgents options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhich.mockResolvedValue(null);
    mockGetVersion.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns all detectors when no options provided', async () => {
    mockLoadAllDetectors.mockResolvedValue([
      { name: 'claude', detect: async () => ({ name: 'claude', binary: '/usr/bin/claude' }) },
      { name: 'codex', detect: async () => ({ name: 'codex', binary: '/usr/bin/codex' }) },
    ] as AgentDetector[]);

    const agents = await detectAgents();
    expect(agents.length).toBe(2);
    expect(mockLoadAllDetectors).toHaveBeenCalledTimes(1);
  });

  it('filters detectors by only[]', async () => {
    mockLoadAllDetectors.mockResolvedValue([
      { name: 'claude', detect: async () => ({ name: 'claude', binary: '/usr/bin/claude' }) },
      { name: 'codex', detect: async () => ({ name: 'codex', binary: '/usr/bin/codex' }) },
    ] as AgentDetector[]);

    const agents = await detectAgents({ only: ['claude'] } satisfies DetectOptions);
    expect(agents.length).toBe(1);
    expect(agents[0].name).toBe('claude');
  });

  it('ignores unknown names in only[]', async () => {
    mockLoadAllDetectors.mockResolvedValue([
      { name: 'claude', detect: async () => ({ name: 'claude', binary: '/usr/bin/claude' }) },
    ] as AgentDetector[]);

    const agents = await detectAgents({ only: ['does-not-exist'] } satisfies DetectOptions);
    expect(agents.length).toBe(0);
  });

  it('passes options through to loadAllDetectors', async () => {
    const options = { only: ['acpx'], probe: false, timeout: 100 } satisfies DetectOptions;

    mockLoadAllDetectors.mockImplementation(async (opts) => {
      expect(opts).toEqual(options);
      return [
        {
          name: 'acpx',
          detect: async () => ({ name: 'acpx', binary: '/usr/bin/acpx', isConfigured: undefined }),
        },
        { name: 'codex', detect: async () => ({ name: 'codex', binary: '/usr/bin/codex' }) },
      ] as AgentDetector[];
    });

    const agents = await detectAgents(options);
    expect(agents.length).toBe(1);
    expect(agents[0].name).toBe('acpx');
  });

  it('passes probe/timeout to config detectors', async () => {
    mockLoadAllDetectors.mockImplementation(async (opts) => {
      expect(opts?.probe).toBe(false);
      expect(opts?.timeout).toBe(100);
      return [
        {
          name: 'claude',
          detect: async () => ({
            name: 'claude',
            binary: '/usr/bin/claude',
            isConfigured: true,
            configSource: 'env',
          }),
        },
      ] as AgentDetector[];
    });

    const agents = await detectAgents({ probe: false, timeout: 100 } satisfies DetectOptions);
    expect(agents.length).toBe(1);
    expect(agents[0].name).toBe('claude');
    expect(agents[0].isConfigured).toBe(true);
    expect(agents[0].configSource).toBe('env');
  });

  it('skips getVersion when probe is false', async () => {
    mockLoadAllDetectors.mockImplementation(async (opts) => {
      expect(opts?.probe).toBe(false);
      return [
        {
          name: 'claude',
          detect: async () => ({
            name: 'claude',
            binary: '/usr/bin/claude',
            isConfigured: true,
            configSource: 'env',
            version: undefined,
          }),
        },
      ] as AgentDetector[];
    });

    mockGetVersion.mockResolvedValue('99.0.0');
    const agents = await detectAgents({ probe: false } satisfies DetectOptions);
    expect(agents.length).toBe(1);
    expect(agents[0].version).toBeUndefined();
    expect(mockGetVersion).not.toHaveBeenCalled();
  });

  it('still calls getVersion when probe is omitted', async () => {
    mockLoadAllDetectors.mockImplementation(async (opts) => {
      expect(opts?.probe).toBeUndefined();
      return [
        {
          name: 'claude',
          detect: async () => ({
            name: 'claude',
            binary: '/usr/bin/claude',
            isConfigured: true,
            configSource: 'env',
            version: '1.0.0',
          }),
        },
      ] as AgentDetector[];
    });

    const agents = await detectAgents({ only: ['claude'] } satisfies DetectOptions);
    expect(agents.length).toBe(1);
    expect(mockGetVersion).not.toHaveBeenCalled();
  });

  it('handles probe:true explicitly like default', async () => {
    mockLoadAllDetectors.mockImplementation(async (opts) => {
      expect(opts?.probe).toBe(true);
      return [
        {
          name: 'claude',
          detect: async () => ({
            name: 'claude',
            binary: '/usr/bin/claude',
            isConfigured: true,
            configSource: 'env',
            version: '1.0.0',
          }),
        },
      ] as AgentDetector[];
    });

    const agents = await detectAgents({ only: ['claude'], probe: true } satisfies DetectOptions);
    expect(agents.length).toBe(1);
  });
});
