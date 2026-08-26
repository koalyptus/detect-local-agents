#!/usr/bin/env node
import yargs from 'yargs';
import { detectAgents, listSupportedAgents } from '../index.js';
import { formatAgents, formatSupportedAgents, type OutputFormat } from './output-format.js';
import type { DetectedAgent } from '../types.js';

export interface CliResult {
  exitCode: number;
}

function writeStdout(text: string): void {
  process.stdout.write(text);
}

function writeStderr(s: string): void {
  process.stderr.write(s);
}

function filterAgents(agents: DetectedAgent[], opts: { configuredOnly: boolean }): DetectedAgent[] {
  return opts.configuredOnly ? agents.filter((agent) => agent.isConfigured) : agents;
}

async function sharedHandler(args: { json?: boolean; configured?: boolean }): Promise<void> {
  const agents = await detectAgents();
  const filtered = filterAgents(agents, { configuredOnly: Boolean(args.configured) });
  const format: OutputFormat = args.json ? 'json' : 'table';
  writeStdout(formatAgents(filtered, format));
  writeStdout('\n');
}

async function listSupportedHandler(args: { json?: boolean }): Promise<void> {
  const supported = await listSupportedAgents();
  const format: OutputFormat = args.json ? 'json' : 'table';
  writeStdout(formatSupportedAgents(supported, format));
  writeStdout('\n');
}

/**
 * Typed exit sentinel — replaces opaque Error('exit:N') strings so tests
 * can distinguish exit-as-flow-control from genuine errors.
 */
export const enum CliExitSentinel {
  SUCCESS = 'exit:0',
  ERROR = 'exit:1',
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
          })
          .option('list-supported', {
            type: 'boolean',
            default: false,
            description: 'Print supported agent ids and exit (no detection performed)',
          }),
      (args) => (args.listSupported ? listSupportedHandler(args) : sharedHandler(args)),
    )
    .command(
      'info <name>',
      'Show details for a single agent by name',
      (y) =>
        y
          .positional('name', {
            type: 'string',
            demandOption: true,
            describe: 'Agent id (e.g. claude_code)',
          })
          .option('json', {
            type: 'boolean',
            default: false,
            description: 'Output in JSON format instead of table',
          }),
      async (args) => {
        const agents = await detectAgents();
        // Match by id first (preferred), then by name for backward compatibility
        const agent = agents.find((a) => a.id === args.name || a.name === args.name);
        if (args.json) {
          writeStdout(agent ? JSON.stringify(agent, null, 2) : 'null');
        } else {
          writeStdout(agent ? formatAgents([agent], 'table') : 'Agents not found.');
        }
        writeStdout('\n');
      },
    )
    .help()
    .alias('help', 'h')
    .version(false)
    .strict()
    .fail((msg) => {
      writeStderr(`error: ${msg}\n`);
      throw new Error(CliExitSentinel.ERROR);
    });

  try {
    await parser.parseAsync();
    return { exitCode: 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === CliExitSentinel.ERROR || message === CliExitSentinel.SUCCESS) {
      throw err;
    }
    writeStderr(`error: ${message}\n`);
    throw new Error(CliExitSentinel.ERROR);
  }
}

// Only auto-run when invoked directly (not when imported by tests).
export function isInvokedDirectly(argv: string[]): boolean {
  const script = argv[1];
  return script !== undefined && (script.endsWith('cli.js') || script.endsWith('cli.ts'));
}

export function autoRun(): Promise<void> | void {
  if (isInvokedDirectly(process.argv)) {
    return runCli(process.argv).then((r) => {
      process.exit(r.exitCode);
    });
  }
}

void autoRun();
