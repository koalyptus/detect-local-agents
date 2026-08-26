// tests/index.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectAgents, listSupportedAgents } from '../src/index.js';

// Mock the detect module
vi.mock('../src/detect/utils.js', () => ({
  which: vi.fn(),
  getVersion: vi.fn(),
}));

// Mock the detectors/index to control which configs are used
vi.mock('../src/detectors/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/detectors/index.js')>();
  return {
    ...actual,
    loadAllDetectors: vi.fn(),
  };
});

import { which, getVersion } from '../src/detect/utils.js';
import { loadAllDetectors } from '../src/detectors/index.js';
import type { AgentDetector, DetectedAgent } from '../src/types.js';

const mockWhich = vi.mocked(which);
const mockGetVersion = vi.mocked(getVersion);
const mockLoadAllDetectors = vi.mocked(loadAllDetectors);

// Store original env vars
const originalEnv: Record<string, string | undefined> = {};

describe('detectAgents', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Save and clear env vars
    originalEnv.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    originalEnv.CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
    originalEnv.OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLAUDE_API_KEY;
    delete process.env.OPENAI_API_KEY;

    // Default: no agents found
    mockWhich.mockResolvedValue(null);
    mockGetVersion.mockResolvedValue(null);
    mockLoadAllDetectors.mockResolvedValue([]);
  });

  afterEach(() => {
    // Restore env vars
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('returns array of DetectedAgent', async () => {
    const agents = await detectAgents();
    expect(Array.isArray(agents)).toBe(true);
  });

  it('each agent has required fields', async () => {
    const mockDetector: AgentDetector = {
      id: 'claude_code',
      detect: async (): Promise<DetectedAgent> => ({
        id: 'claude_code',
        name: 'claude',
        binary: '/usr/bin/claude',
        version: '1.0.0',
        isConfigured: false,
      }),
    };

    mockLoadAllDetectors.mockResolvedValue([mockDetector]);

    const agents = await detectAgents();

    expect(agents.length).toBe(1);
    expect(agents[0].id).toBe('claude_code');
    expect(agents[0].name).toBe('claude');
    expect(agents[0].binary).toBe('/usr/bin/claude');
  });

  it('detects multiple agents', async () => {
    const mockDetectors: AgentDetector[] = [
      {
        id: 'claude_code',
        detect: async (): Promise<DetectedAgent> => ({
          id: 'claude_code',
          name: 'claude',
          binary: '/usr/bin/claude',
        }),
      },
      {
        id: 'codex_cli',
        detect: async (): Promise<DetectedAgent> => ({
          id: 'codex_cli',
          name: 'codex',
          binary: '/usr/bin/codex',
        }),
      },
    ];

    mockLoadAllDetectors.mockResolvedValue(mockDetectors);

    const agents = await detectAgents();

    expect(agents.length).toBe(2);
    expect(agents.map((a) => a.id)).toEqual(['claude_code', 'codex_cli']);
  });

  it('skips agents not found', async () => {
    const mockDetector: AgentDetector = {
      id: 'claude_code',
      detect: async () => null,
    };

    mockLoadAllDetectors.mockResolvedValue([mockDetector]);

    const agents = await detectAgents();

    expect(agents.length).toBe(0);
  });

  it('checks isConfigured from env vars', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';

    const mockDetector: AgentDetector = {
      id: 'claude_code',
      detect: async (): Promise<DetectedAgent> => ({
        id: 'claude_code',
        name: 'claude',
        binary: '/usr/bin/claude',
        isConfigured: !!process.env.ANTHROPIC_API_KEY,
      }),
    };

    mockLoadAllDetectors.mockResolvedValue([mockDetector]);

    const agents = await detectAgents();

    expect(agents.length).toBe(1);
    expect(agents[0].isConfigured).toBe(true);
  });

  it('isConfigured false when no env vars', async () => {
    const mockDetector: AgentDetector = {
      id: 'claude_code',
      detect: async (): Promise<DetectedAgent> => ({
        id: 'claude_code',
        name: 'claude',
        binary: '/usr/bin/claude',
        isConfigured: !!process.env.ANTHROPIC_API_KEY,
      }),
    };

    mockLoadAllDetectors.mockResolvedValue([mockDetector]);

    const agents = await detectAgents();

    expect(agents.length).toBe(1);
    expect(agents[0].isConfigured).toBe(false);
  });

  it('handles detector errors gracefully', async () => {
    const mockDetector: AgentDetector = {
      id: 'failing-agent',
      detect: async () => {
        throw new Error('Detection failed');
      },
    };

    const workingDetector: AgentDetector = {
      id: 'working-agent',
      detect: async (): Promise<DetectedAgent> => ({
        id: 'working-agent',
        name: 'working-agent',
        binary: '/usr/bin/working',
      }),
    };

    mockLoadAllDetectors.mockResolvedValue([mockDetector, workingDetector]);

    const agents = await detectAgents();

    // Should only include working agent
    expect(agents.length).toBe(1);
    expect(agents[0].name).toBe('working-agent');
  });
});

describe('listSupportedAgents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadAllDetectors.mockResolvedValue([]);
  });

  it('returns an array', async () => {
    const supported = await listSupportedAgents();
    expect(Array.isArray(supported)).toBe(true);
  });

  it('each entry has a non-empty id string', async () => {
    const mockDetectors: AgentDetector[] = [
      { id: 'claude_code', detect: async () => null },
      { id: 'codex_cli', detect: async () => null },
    ];
    mockLoadAllDetectors.mockResolvedValue(mockDetectors);

    const supported = await listSupportedAgents();

    expect(supported.length).toBe(2);
    for (const s of supported) {
      expect(typeof s.id).toBe('string');
      expect(s.id.length).toBeGreaterThan(0);
    }
  });

  it('ids are unique (set-equality)', async () => {
    const mockDetectors: AgentDetector[] = [
      { id: 'claude_code', detect: async () => null },
      { id: 'codex_cli', detect: async () => null },
      { id: 'claude_code', detect: async () => null }, // duplicate
    ];
    mockLoadAllDetectors.mockResolvedValue(mockDetectors);

    const supported = await listSupportedAgents();
    const ids = supported.map((s) => s.id);
    const uniqueIds = [...new Set(ids)];

    expect(ids).toEqual(uniqueIds);
  });

  it('does NOT call detect() on any detector', async () => {
    const detectSpy = vi.fn(async () => null);
    const mockDetectors: AgentDetector[] = [
      { id: 'claude_code', detect: detectSpy },
      { id: 'codex_cli', detect: detectSpy },
    ];
    mockLoadAllDetectors.mockResolvedValue(mockDetectors);

    await listSupportedAgents();

    expect(detectSpy).not.toHaveBeenCalled();
  });

  it('derived from loadAllDetectors()', async () => {
    const mockDetectors: AgentDetector[] = [
      { id: 'claude_code', detect: async () => null },
      { id: 'acpx', detect: async () => null },
      { id: 'rovodev', detect: async () => null },
    ];
    mockLoadAllDetectors.mockResolvedValue(mockDetectors);

    const supported = await listSupportedAgents();

    const expectedIds = ['claude_code', 'acpx', 'rovodev'];
    expect(supported.map((s) => s.id)).toEqual(expectedIds);
  });

  it('dedupe: removes duplicate ids', async () => {
    const mockDetectors: AgentDetector[] = [
      { id: 'claude_code', detect: async () => null },
      { id: 'codex_cli', detect: async () => null },
      { id: 'claude_code', detect: async () => null },
      { id: 'codex_cli', detect: async () => null },
    ];
    mockLoadAllDetectors.mockResolvedValue(mockDetectors);

    const supported = await listSupportedAgents();

    expect(supported).toHaveLength(2);
    expect(supported.map((s) => s.id)).toEqual(['claude_code', 'codex_cli']);
  });

  it('includes both config-based and file-based ids', async () => {
    const mockDetectors: AgentDetector[] = [
      // config-based style id
      { id: 'claude_code', detect: async () => null },
      // file-based style id
      { id: 'acpx', detect: async () => null },
      { id: 'rovodev', detect: async () => null },
    ];
    mockLoadAllDetectors.mockResolvedValue(mockDetectors);

    const supported = await listSupportedAgents();
    const ids = supported.map((s) => s.id);

    expect(ids).toContain('claude_code');
    expect(ids).toContain('acpx');
    expect(ids).toContain('rovodev');
  });
});
