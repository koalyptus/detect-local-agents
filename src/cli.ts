#!/usr/bin/env node
import yargs from 'yargs';
import { detectAgents } from './index.js';
import { formatAgents, type OutputFormat } from './output-format.js';
import type { DetectedAgent } from './types.js';

export interface CliResult {
  exitCode: number;
}

function writeStdout(s: string): void {
  process.stdout.write(s);
}

function writeStderr(s: string): void {
  process.stderr.write(s);
}

function filterAgents(agents: DetectedAgent[], opts: { configuredOnly: boolean }): DetectedAgent[] {
  return opts.configuredOnly ? agents.filter((a) => a.isConfigured) : agents;
}

export async function runCli(argv: string[]): Promise<CliResult> {
  const parser = yargs(argv.slice(2))
    .scriptName('detect-local-agents')
    .usage('$0 [command] [options]')
    .command(
      '$0',
      'Detect locally installed AI agents (default)',
      (y) =>
        y
          .option('json', {
            type: 'boolean',
            default: false,
            description: 'Output as JSON instead of a table',
          })
          .option('configured', {
            type: 'boolean',
            default: false,
            description: 'Only show agents with auth/configured',
          }),
      async (args) => {
        const agents = await detectAgents();
        const filtered = filterAgents(agents, { configuredOnly: Boolean(args.configured) });
        const format: OutputFormat = args.json ? 'json' : 'table';
        writeStdout(formatAgents(filtered, format));
        writeStdout('\n');
      },
    )
    .command(
      'ls',
      'Alias for default detect command',
      (y) =>
        y
          .option('json', { type: 'boolean', default: false })
          .option('configured', { type: 'boolean', default: false }),
      async (args) => {
        const agents = await detectAgents();
        const filtered = filterAgents(agents, { configuredOnly: Boolean(args.configured) });
        const format: OutputFormat = args.json ? 'json' : 'table';
        writeStdout(formatAgents(filtered, format));
        writeStdout('\n');
      },
    )
    .command(
      'info <name>',
      'Show details for a single agent by name',
      (y) =>
        y.positional('name', {
          type: 'string',
          demandOption: true,
          describe: 'Agent name (e.g. claude)',
        }),
      async (args) => {
        const agents = await detectAgents();
        const agent = agents.find((a) => a.name === args.name);
        // No agent found is not an error — print null to stdout and exit 0
        writeStdout(agent ? JSON.stringify(agent, null, 2) : 'null');
        writeStdout('\n');
      },
    )
    .help()
    .alias('help', 'h')
    .version(false)
    .strict()
    .fail((msg) => {
      writeStderr(`error: ${msg}\n`);
      process.exit(1);
    });

  try {
    await parser.parseAsync();
    return { exitCode: 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith('exit:')) {
      throw err;
    }
    writeStderr(`error: ${message}\n`);
    throw new Error('exit:1');
  }
}

// Only auto-run when invoked directly (not when imported by tests).
const invokedDirectly =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith('cli.js') || process.argv[1].endsWith('cli.ts'));

if (invokedDirectly) {
  void runCli(process.argv).then((r) => {
    process.exit(r.exitCode);
  });
}
