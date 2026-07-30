import { describe, it, expect } from 'vitest';
import { formatAgents } from '../../src/cli/output-format.js';
import type { DetectedAgent } from '../../src/types.js';

describe('formatAgents - json', () => {
  it('returns pretty-printed JSON of agents', () => {
    const agents: DetectedAgent[] = [
      { name: 'claude', binary: '/usr/bin/claude', version: '1.0.0', isConfigured: true },
      { name: 'codex', binary: '/usr/bin/codex', version: '0.5.2', isConfigured: false },
    ];

    const result = formatAgents(agents, 'json');
    const parsed = JSON.parse(result);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe('claude');
    expect(parsed[0].isConfigured).toBe(true);
  });

  it('returns empty array as JSON for no agents', () => {
    const result = formatAgents([], 'json');
    expect(result).toBe('[]');
  });
});

describe('formatAgents - table', () => {
  it('renders agents as aligned table with name, version, configured, binary', () => {
    const agents: DetectedAgent[] = [
      { name: 'claude', binary: '/usr/bin/claude', version: '1.0.0', isConfigured: true },
      { name: 'codex', binary: '/usr/bin/codex', version: '0.5.2', isConfigured: false },
    ];

    const result = formatAgents(agents, 'table');
    const lines = result.split('\n');

    // Header + separator + 2 rows = 4 lines
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain('NAME');
    expect(lines[0]).toContain('VERSION');
    expect(lines[0]).toContain('CONFIGURED');
    expect(lines[0]).toContain('BINARY');
    expect(lines[2]).toContain('claude');
    expect(lines[2]).toContain('1.0.0');
    expect(lines[2]).toContain('yes');
    expect(lines[3]).toContain('codex');
    expect(lines[3]).toContain('0.5.2');
    expect(lines[3]).toContain('no');
  });

  it('shows "—" for missing version', () => {
    const agents: DetectedAgent[] = [
      { name: 'cline', binary: '/usr/bin/cline', isConfigured: false },
    ];

    const result = formatAgents(agents, 'table');
    expect(result).toContain('—');
  });

  it('shows "no agents detected" for empty list', () => {
    const result = formatAgents([], 'table');
    expect(result).toBe('No agents detected.');
  });
});
