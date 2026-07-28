#!/usr/bin/env node
'use strict';
const path = require('path');
const { spawnSync } = require('child_process');

const cliJs = path.resolve(__dirname, '..', 'dist', 'cli.js');
const result = spawnSync(process.execPath, [cliJs, ...process.argv.slice(2)], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
