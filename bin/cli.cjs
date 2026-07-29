#!/usr/bin/env node
'use strict';
const path = require('path');
const { spawnSync } = require('child_process');

const cliJs = path.resolve(__dirname, '..', 'dist', 'cli.js');

try {
  require('fs').accessSync(cliJs, require('fs').constants.F_OK);
} catch {
  console.error(
    '⚠️  dist/cli.js not found. Run "npm run build" to compile the TypeScript sources.',
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [cliJs, ...process.argv.slice(2)], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
