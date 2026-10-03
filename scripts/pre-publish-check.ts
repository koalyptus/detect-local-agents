#!/usr/bin/env node
/**
 * Pre-publish verification: packs the tarball, installs it into a throwaway
 * consumer directory, and asserts that the installed package works end-to-end.
 *
 * Checks:
 *   1. `detect-local-agents --help` prints usage.
 *   2. `dla --help` prints usage (alias).
 *   3. `detect-local-agents --list-supported` lists supported agent ids.
 *   4. `detect-local-agents --list-supported --json` outputs valid JSON.
 *
 * This catches packaging regressions such as `dist/` or `bin/` being
 * dropped from `files`, which would break the installed CLI at runtime.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

// Read version from package.json
const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };
const expectedVersion = pkg.version;

let scratchDir = '';

function cleanup(): void {
  if (scratchDir) {
    try {
      rmSync(scratchDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
}

function failCheck(message: string): never {
  console.error(`pre-publish check FAILED: ${message}`);
  cleanup();
  process.exit(1);
}

function logPass(message: string): void {
  console.log(`  ok: ${message}`);
}

// Step 1: Pack the tarball
console.log('Packing tarball...');
scratchDir = mkdtempSync(join(tmpdir(), 'dla-pre-publish-'));

const packResult = spawnSync('npm', ['pack', '--pack-destination', scratchDir], {
  cwd: repoRoot,
  encoding: 'utf-8',
  timeout: 60_000,
});

if (packResult.status !== 0) {
  failCheck(`npm pack failed: ${packResult.stderr}`);
}

const tarballName = `detect-local-agents-${expectedVersion}.tgz`;
const tarballPath = join(scratchDir, tarballName);

if (!existsSync(tarballPath)) {
  failCheck(`tarball not found at ${tarballPath}`);
}

logPass(`tarball created: ${tarballName}`);

// Step 2: Install into a throwaway consumer directory
console.log('Installing into throwaway consumer...');
const consumerDir = join(scratchDir, 'consumer');
mkdirSync(consumerDir, { recursive: true });

const initResult = spawnSync('npm', ['init', '-y'], {
  cwd: consumerDir,
  encoding: 'utf-8',
  timeout: 30_000,
});

if (initResult.status !== 0) {
  failCheck(`npm init failed: ${initResult.stderr}`);
}

const npmInstallResult = spawnSync('npm', ['install', tarballPath], {
  cwd: consumerDir,
  encoding: 'utf-8',
  timeout: 120_000,
});

if (npmInstallResult.status !== 0) {
  failCheck(`npm install failed: ${npmInstallResult.stderr}`);
}

logPass('installed into consumer directory');

// Step 3: Check `detect-local-agents --help`
console.log('Checking detect-local-agents --help...');
const helpResult = spawnSync('./node_modules/.bin/detect-local-agents', ['--help'], {
  cwd: consumerDir,
  encoding: 'utf-8',
  timeout: 15_000,
});

if (helpResult.status !== 0) {
  failCheck(`detect-local-agents --help exited with ${helpResult.status}: ${helpResult.stderr}`);
}

if (!helpResult.stdout.includes('detect-local-agents')) {
  failCheck('detect-local-agents --help output does not mention detect-local-agents');
}

logPass('detect-local-agents --help works');

// Step 4: Check `dla --help` (alias)
console.log('Checking dla --help...');
const dlaHelpResult = spawnSync('./node_modules/.bin/dla', ['--help'], {
  cwd: consumerDir,
  encoding: 'utf-8',
  timeout: 15_000,
});

if (dlaHelpResult.status !== 0) {
  failCheck(`dla --help exited with ${dlaHelpResult.status}: ${dlaHelpResult.stderr}`);
}

logPass('dla --help works');

// Step 5: Check `detect-local-agents --list-supported`
console.log('Checking detect-local-agents --list-supported...');
const listResult = spawnSync('./node_modules/.bin/detect-local-agents', ['--list-supported'], {
  cwd: consumerDir,
  encoding: 'utf-8',
  timeout: 15_000,
});

if (listResult.status !== 0) {
  failCheck(
    `detect-local-agents --list-supported exited with ${listResult.status}: ${listResult.stderr}`,
  );
}

if (!listResult.stdout.includes('ID')) {
  failCheck('detect-local-agents --list-supported output does not mention ID');
}

logPass('detect-local-agents --list-supported works');

// Step 6: Check `detect-local-agents --list-supported --json`
console.log('Checking detect-local-agents --list-supported --json...');
const jsonResult = spawnSync(
  './node_modules/.bin/detect-local-agents',
  ['--list-supported', '--json'],
  {
    cwd: consumerDir,
    encoding: 'utf-8',
    timeout: 15_000,
  },
);

if (jsonResult.status !== 0) {
  failCheck(
    `detect-local-agents --list-supported --json exited with ${jsonResult.status}: ${jsonResult.stderr}`,
  );
}

let parsed: unknown;
try {
  parsed = JSON.parse(jsonResult.stdout);
} catch (err) {
  failCheck(`detect-local-agents --list-supported --json output is not valid JSON: ${err}`);
}

if (!Array.isArray(parsed)) {
  failCheck('detect-local-agents --list-supported --json output is not an array');
}

if (parsed.length === 0) {
  failCheck('detect-local-agents --list-supported --json output is empty');
}

for (const item of parsed) {
  if (typeof (item as { id?: unknown }).id !== 'string') {
    failCheck('detect-local-agents --list-supported --json item missing id');
  }
}

logPass(`detect-local-agents --list-supported --json works (${parsed.length} agents)`);

// All checks passed
console.log('\nAll pre-publish checks passed.');
cleanup();
process.exit(0);
