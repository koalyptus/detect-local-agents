import type { DetectedAgent, SupportedAgent } from '../types.js';

export type OutputFormat = 'json' | 'table';

const PAD = 2;

function padRight(s: string, width: number): string {
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

function buildRow(cols: string[], widths: number[]): string {
  return cols
    .map((c, i) => padRight(c, widths[i]!))
    .join(' '.repeat(PAD))
    .trimEnd();
}

function buildSeparator(widths: number[]): string {
  return widths.map((w) => '-'.repeat(w)).join(' '.repeat(PAD));
}

function renderTable(agents: DetectedAgent[]): string {
  if (agents.length === 0) {
    return 'No agents detected.';
  }

  const headers = ['NAME', 'VERSION', 'CONFIGURED', 'BINARY'];
  const rows = agents.map((a) => [
    a.name,
    a.version ?? '—',
    a.isConfigured ? 'yes' : 'no',
    a.binary,
  ]);

  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)));

  const lines: string[] = [
    buildRow(headers, widths),
    buildSeparator(widths),
    ...rows.map((r) => buildRow(r, widths)),
  ];

  return lines.join('\n');
}

function renderSupportedTable(supported: SupportedAgent[]): string {
  if (supported.length === 0) {
    return 'No supported agents.';
  }

  const headers = ['ID'];
  const rows = supported.map((s) => [s.id]);

  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)));

  const lines: string[] = [
    buildRow(headers, widths),
    buildSeparator(widths),
    ...rows.map((r) => buildRow(r, widths)),
  ];

  return lines.join('\n');
}

function renderJson<T>(items: T[]): string {
  return JSON.stringify(items, null, 2);
}

export function formatAgents(agents: DetectedAgent[], format: OutputFormat): string {
  return format === 'json' ? renderJson(agents) : renderTable(agents);
}

export function formatSupportedAgents(supported: SupportedAgent[], format: OutputFormat): string {
  return format === 'json' ? renderJson(supported) : renderSupportedTable(supported);
}
