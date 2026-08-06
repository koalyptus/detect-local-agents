import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as indexModule from '../../src/index.js';
import { runCli, isInvokedDirectly, autoRun } from '../../src/cli/cli.js';

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

    await runCli(['node', 'detect-local-agents', '--configured']);

    const out = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toContain('claude');
    expect(out).not.toContain('codex');
  });

  it('exits 1 when detectAgents throws', async () => {
    mockDetectAgents.mockRejectedValue(new Error('boom'));

    await expect(runCli(['node', 'detect-local-agents'])).rejects.toThrow('exit:1');

    const err = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(err).toContain('boom');
  });

  it('re-throws exit errors from catch block', async () => {
    // Trigger the catch block's "if message starts with exit:" branch
    // by making the fail handler throw an exit:1 error
    mockDetectAgents.mockRejectedValue(new Error('exit:1'));

    await expect(runCli(['node', 'detect-local-agents'])).rejects.toThrow('exit:1');
  });

  it('handles non-Error rejections via String() fallback in catch', async () => {
    // Trigger the err instanceof Error ? err.message : String(err) else-branch
    // by having the handler throw a plain string, not an Error object
    mockDetectAgents.mockRejectedValue('something went wrong');

    await expect(runCli(['node', 'detect-local-agents'])).rejects.toThrow('exit:1');

    const err = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(err).toContain('something went wrong');
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

  it('prints single agent as JSON with --json flag', async () => {
    mockDetectAgents.mockResolvedValue([
      { name: 'claude', binary: '/usr/bin/claude', version: '1.0.0', isConfigured: true },
    ]);

    await runCli(['node', 'detect-local-agents', 'info', 'claude', '--json']);

    const out = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    const parsed = JSON.parse(out);
    expect(parsed.name).toBe('claude');
  });

  it('prints null JSON when agent not found with --json', async () => {
    mockDetectAgents.mockResolvedValue([
      { name: 'claude', binary: '/usr/bin/claude', isConfigured: true },
    ]);

    await runCli(['node', 'detect-local-agents', 'info', 'nonexistent', '--json']);

    const out = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toBe('null\n');
    // No stderr output for missing agent with --json — no agent found is not an error
    const err = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(err).toBe('');
  });

  it('prints user-friendly message when agent not found without --json', async () => {
    mockDetectAgents.mockResolvedValue([
      { name: 'claude', binary: '/usr/bin/claude', isConfigured: true },
    ]);

    await runCli(['node', 'detect-local-agents', 'info', 'nonexistent']);

    const out = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toBe('Agents not found.\n');
    // No stderr output for missing agent — no agent found is not an error
    const err = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(err).toBe('');
  });

  it('prints table for single agent without --json', async () => {
    mockDetectAgents.mockResolvedValue([
      { name: 'claude', binary: '/usr/bin/claude', version: '1.0.0', isConfigured: true },
    ]);

    await runCli(['node', 'detect-local-agents', 'info', 'claude']);

    const out = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toContain('NAME');
    expect(out).toContain('claude');
    expect(out).toContain('1.0.0');
  });
});

describe('cli - auto-run guard', () => {
  beforeEach(() => {
    // autoRun() below runs the real CLI, which writes its output to stdout.
    // Without these spies the formatted output leaks into the test reporter.
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects direct invocation from cli.js', () => {
    expect(isInvokedDirectly(['node', '/path/to/cli.js'])).toBe(true);
  });

  it('detects direct invocation from cli.ts', () => {
    expect(isInvokedDirectly(['tsx', '/path/to/cli.ts'])).toBe(true);
  });

  it('returns false when imported as module', () => {
    expect(isInvokedDirectly(['node', '/path/to/vitest.js'])).toBe(false);
  });

  it('returns false when argv is empty', () => {
    expect(isInvokedDirectly([])).toBe(false);
  });

  it('autoRun calls process.exit when invoked directly', async () => {
    const origArgv = process.argv;
    process.argv = ['node', '/path/to/cli.js'];

    // Spy on process.exit — the module-level
    // void autoRun() fires on the first import and needs the spy in place.
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit:0');
    }) as never);

    // Mock detectAgents so the auto-run doesn't run the real detection
    vi.spyOn(indexModule, 'detectAgents').mockResolvedValue([]);

    await expect(autoRun()).rejects.toThrow('exit:0');

    expect(exitSpy).toHaveBeenCalledWith(0);
    process.argv = origArgv;
  });

  it('autoRun skips process.exit when not invoked directly', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => 1) as never);

    autoRun();

    expect(exitSpy).not.toHaveBeenCalled();
  });
});
