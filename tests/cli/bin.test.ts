import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('package.json - bin wiring', () => {
  const pkgPath = resolve(process.cwd(), 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    bin?: Record<string, string>;
  };

  it('declares detect-local-agents bin pointing to dist/cli/cli.js', () => {
    expect(pkg.bin).toBeDefined();
    expect(pkg.bin?.['detect-local-agents']).toBe('./dist/cli/cli.js');
  });

  it('declares dla alias pointing to the same bin', () => {
    expect(pkg.bin?.['dla']).toBe('./dist/cli/cli.js');
  });
});
