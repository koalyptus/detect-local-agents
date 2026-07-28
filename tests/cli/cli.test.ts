// tests/cli/cli.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as indexModule from '../../src/index.js';

describe('cli - detect command', () => {
  let mockDetectAgents: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockDetectAgents = vi.spyOn(indexModule, 'detectAgents');
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints table of detected agents by default', async () => {
    mockDetectAgents.mockResolvedValue([
      { name: 'claude', binary: '/usr/bin/claude', version: '1.0.0', isConfigured: true },
    ]);

    const { runCli } = await import('../../src/cli.js');
    await runCli(['node', 'detect-local-agents']);

    expect(mockDetectAgents).toHaveBeenCalledOnce();
    const out = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toContain('NAME');
    expect(out).toContain('claude');
  });

  it('prints JSON when --json flag is set', async () => {
    mockDetectAgents.mockResolvedValue([
      { name: 'claude', binary: '/usr/bin/claude', version: '1.0.0', isConfigured: true },
    ]);

    const { runCli } = await import('../../src/cli.js');
    await runCli(['node', 'detect-local-agents', '--json']);

    const out = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(() => JSON.parse(out)).not.toThrow();
    const parsed = JSON.parse(out);
    expect(parsed[0].name).toBe('claude');
  });

  it('filters to configured-only with --configured', async () => {
    mockDetectAgents.mockResolvedValue([
      { name: 'claude', binary: '/usr/bin/claude', isConfigured: true },
      { name: 'codex', binary: '/usr/bin/codex', isConfigured: false },
    ]);

    const { runCli } = await import('../../src/cli.js');
    await runCli(['node', 'detect-local-agents', '--configured']);

    const out = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toContain('claude');
    expect(out).not.toContain('codex');
  });

  it('exits 1 when detectAgents throws', async () => {
    mockDetectAgents.mockRejectedValue(new Error('boom'));

    const { runCli } = await import('../../src/cli.js');
    await expect(runCli(['node', 'detect-local-agents'])).rejects.toThrow('exit:1');

    const err = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(err).toContain('boom');
  });
});

describe('cli - info command', () => {
  let mockDetectAgents: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockDetectAgents = vi.spyOn(indexModule, 'detectAgents');
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints single agent as JSON', async () => {
    mockDetectAgents.mockResolvedValue([
      { name: 'claude', binary: '/usr/bin/claude', version: '1.0.0', isConfigured: true },
    ]);

    const { runCli } = await import('../../src/cli.js');
    await runCli(['node', 'detect-local-agents', 'info', 'claude']);

    const out = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    const parsed = JSON.parse(out);
    expect(parsed.name).toBe('claude');
  });

  it('prints null to stdout and exits 0 when agent not found', async () => {
    mockDetectAgents.mockResolvedValue([
      { name: 'claude', binary: '/usr/bin/claude', isConfigured: true },
    ]);

    const { runCli } = await import('../../src/cli.js');
    await runCli(['node', 'detect-local-agents', 'info', 'nonexistent']);

    const out = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toBe('null\n');
    // No stderr output for missing agent — no agent found is not an error
    const err = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(err).toBe('');
  });
});
