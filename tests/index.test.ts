// tests/index.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectAgents } from '../src/index.js';

// Mock the detect module
vi.mock('../src/detect.js', () => ({
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

import { which, getVersion } from '../src/detect.js';
import { loadAllDetectors } from '../src/detectors/index.js';
import type { AgentDetector } from '../src/types.js';

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
    // Create a mock detector
    const mockDetector: AgentDetector = {
      name: 'claude',
      detect: async () => ({
        name: 'claude',
        binary: '/usr/bin/claude',
        version: '1.0.0',
        isConfigured: false,
      }),
    };

    mockLoadAllDetectors.mockResolvedValue([mockDetector]);

    const agents = await detectAgents();

    expect(agents.length).toBe(1);
    expect(agents[0].name).toBe('claude');
    expect(agents[0].binary).toBe('/usr/bin/claude');
  });

  it('detects multiple agents', async () => {
    const mockDetectors: AgentDetector[] = [
      {
        name: 'claude',
        detect: async () => ({
          name: 'claude',
          binary: '/usr/bin/claude',
        }),
      },
      {
        name: 'codex',
        detect: async () => ({
          name: 'codex',
          binary: '/usr/bin/codex',
        }),
      },
    ];

    mockLoadAllDetectors.mockResolvedValue(mockDetectors);

    const agents = await detectAgents();

    expect(agents.length).toBe(2);
    expect(agents.map((a) => a.name)).toEqual(['claude', 'codex']);
  });

  it('skips agents not found', async () => {
    const mockDetector: AgentDetector = {
      name: 'claude',
      detect: async () => null,
    };

    mockLoadAllDetectors.mockResolvedValue([mockDetector]);

    const agents = await detectAgents();

    expect(agents.length).toBe(0);
  });

  it('checks isConfigured from env vars', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';

    const mockDetector: AgentDetector = {
      name: 'claude',
      detect: async () => ({
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
    // Ensure env vars are cleared (done in beforeEach)

    const mockDetector: AgentDetector = {
      name: 'claude',
      detect: async () => ({
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
      name: 'failing-agent',
      detect: async () => {
        throw new Error('Detection failed');
      },
    };

    const workingDetector: AgentDetector = {
      name: 'working-agent',
      detect: async () => ({
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
