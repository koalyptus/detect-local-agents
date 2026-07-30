import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('package.json - bin wiring', () => {
  const pkgPath = resolve(process.cwd(), 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    bin?: Record<string, string>;
  };

  it('declares detect-local-agents bin pointing to bin/cli.cjs', () => {
    expect(pkg.bin).toBeDefined();
    expect(pkg.bin?.['detect-local-agents']).toBe('./bin/cli.cjs');
  });

  it('declares dla alias pointing to the same bin', () => {
    expect(pkg.bin?.['dla']).toBe('./bin/cli.cjs');
  });
});

describe('bin/cli.cjs', () => {
  const binPath = resolve(process.cwd(), 'bin', 'cli.cjs');
  const content = readFileSync(binPath, 'utf8');

  it('exists and is referenced by package.json', () => {
    expect(content.length).toBeGreaterThan(0);
  });

  it('starts with a node shebang', () => {
    expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
  });

  it('spawns dist/cli/cli.js', () => {
    expect(content).toContain('dist/cli/cli.js');
  });
});
