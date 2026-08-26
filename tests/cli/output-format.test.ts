import { describe, it, expect } from 'vitest';
import { formatAgents, formatSupportedAgents } from '../../src/cli/output-format.js';
import type { DetectedAgent, SupportedAgent } from '../../src/types.js';

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

describe('formatSupportedAgents - json', () => {
  it('returns pretty-printed JSON of supported agents', () => {
    const supported: SupportedAgent[] = [{ id: 'claude_code' }, { id: 'codex_cli' }];

    const result = formatSupportedAgents(supported, 'json');
    const parsed = JSON.parse(result);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe('claude_code');
    expect(parsed[1].id).toBe('codex_cli');
  });

  it('returns empty array as JSON for no supported agents', () => {
    const result = formatSupportedAgents([], 'json');
    expect(result).toBe('[]');
  });
});

describe('formatSupportedAgents - table', () => {
  it('renders supported agents as a single-column ID table', () => {
    const supported: SupportedAgent[] = [{ id: 'claude_code' }, { id: 'codex_cli' }];

    const result = formatSupportedAgents(supported, 'table');
    const lines = result.split('\n');

    // Header + separator + 2 rows = 4 lines
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain('ID');
    expect(lines[2]).toContain('claude_code');
    expect(lines[3]).toContain('codex_cli');
  });

  it('renders a single supported agent', () => {
    const result = formatSupportedAgents([{ id: 'acpx' }], 'table');
    const lines = result.split('\n');

    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('ID');
    expect(lines[2]).toContain('acpx');
  });

  it('column width is driven by the longest id', () => {
    const supported: SupportedAgent[] = [{ id: 'a' }, { id: 'a-much-longer-id' }];

    const result = formatSupportedAgents(supported, 'table');
    const lines = result.split('\n');

    // Separator width must match the longest id, not the 'ID' header
    expect(lines[1]).toBe('-'.repeat('a-much-longer-id'.length));
    expect(lines[3]).toContain('a-much-longer-id');
  });

  it('shows "No supported agents." for empty list', () => {
    const result = formatSupportedAgents([], 'table');
    expect(result).toBe('No supported agents.');
  });
});
