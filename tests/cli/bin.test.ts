// tests/cli/bin.test.ts
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
