---
name: adding-a-new-agent
description: 'Add detection for a new AI agent: config entry or file-based detector.'
license: MIT
metadata:
  tags: [AI Agents, Detection, TypeScript, Contribution]
---

# Adding a New Agent

Add detection for a new AI agent to `detect-local-agents`.

## Quick Decision

| Condition                                                | Path                                        |
| -------------------------------------------------------- | ------------------------------------------- |
| Agent has a binary in PATH + simple config check         | [Config entry](#config-entry)               |
| Agent needs custom logic (file probes, env markers, pip) | [File-based detector](#file-based-detector) |

When in doubt, start with a config entry. It's one object literal and zero new files.

## Config Entry

Add an entry to `src/config/configs.ts` in the `detectorConfigs` array. The entry is auto-discovered at startup — no registration step.

```typescript
{
  name: 'myagent',          // unique id, kebab-case
  binary: 'myagent',        // command to find via which/where
  configEnvVars: ['MYAGENT_API_KEY'],  // optional: env vars = configured
  configDir: '~/.myagent',  // optional: dir presence = configured
  versionArgs: ['--version'], // optional, default is ['--version']
  isACPAgent: false,        // optional: needs acpx to run
}
```

### Detection pipeline

`configToDetector` (in `src/detectors/index.ts`) runs, per entry:

1. `which(binary)` — not found → agent absent
2. `getVersion(binary, versionArgs)` — 5s timeout, null if unavailable
3. Configured check (first hit wins), each arm producing its own `configSource`:
   - Any `configEnvVars` set in `process.env`? → `configSource: 'env'`
   - `config.json` exists inside `configDir`? → `configSource: 'config-file'`
   - `configDir` directory exists at all? → `configSource: 'config-dir'`
   - No signal → `isConfigured: false`, no `configSource`

### Configured meaning

| Output                | Meaning                                               |
| --------------------- | ----------------------------------------------------- |
| `isConfigured: true`  | Evidence of user setup — NOT proof that auth is valid |
| `isConfigured: false` | Binary found on disk but no sign of user setup        |

### nameResolver (rare)

When one binary serves two identities depending on environment, add a `nameResolver`:

```typescript
{
  name: 'claude',
  binary: 'claude',
  configEnvVars: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'],
  configDir: '~/.claude',
  nameResolver: (env) => env['CLAUDE_CODE_IS_COWORK'] ? 'cowork' : 'claude',
},
```

The `name` field is the default; `nameResolver` overrides it at detection time.

## The `configSource` Contract

Every detector that reports `isConfigured: true` should also say _how_ the setup
evidence was found. The four values, in order of evidence strength:

| `configSource`  | Evidence                                                       |
| --------------- | -------------------------------------------------------------- |
| `'env'`         | An env var is set                                              |
| `'config-file'` | A config file exists (`config.json` in the config dir)         |
| `'config-dir'`  | The config dir exists (weakest — a first run creates it)       |
| `'probe'`       | A live command against the binary succeeded (e.g. `acpx list`) |

**One-directional invariant:** if `configSource` is set then `isConfigured` is
`true`; the converse does not hold — a detector may report `isConfigured: true`
without a `configSource`. `devin.detector.ts` is the deliberate exception.

Rules:

- Never set `configSource` alongside `isConfigured: false`.
- Never invent a fifth value; never use a placeholder value.
- First match wins — keep the cascade order above.

`tests/detectors/invariant.test.ts` enforces this repo-wide — keep it green.

## File-based Detector

For agents that need custom detection logic (file-existence checks, pip packages, environment markers, ACP probes).

### Convention

Create `src/detectors/<name>.detector.ts`. The file is **auto-discovered** — no import or registration needed.

- Filename must match `*.detector.ts` (or `.js`)
- Must `export default` an object implementing `AgentDetector`
- `index.ts` is excluded from auto-discovery

### Minimal example

Use the `withConfigSource` helper to attach a `configSource` — don't hand-roll the conditional spread:

```typescript
// src/detectors/myagent.detector.ts
import type { AgentDetector, DetectedAgent, DetectOptions } from '../types.js';
import { which, getVersion, withConfigSource } from '../detect/utils.js';

const detector: AgentDetector = {
  name: 'myagent',

  async detect(options?: DetectOptions): Promise<DetectedAgent | null> {
    const binary = await which('myagent');
    if (!binary) return null;

    const isConfigured = /* your check */;
    return withConfigSource(
      {
        name: 'myagent',
        binary,
        version: (await getVersion(binary)) ?? undefined,
        isConfigured,
      },
      isConfigured ? 'env' : undefined,
    );
  },
};

export default detector;
```

`detect(options?)` accepts an optional `DetectOptions` (`only` / `probe` / `timeout`,
see `src/types.ts`). The parameter is optional, so existing callers and the CLI — which
call `detect()` with no arguments — are unaffected. Do **not** use module-level setter
functions to pass options into a detector; thread them through `options` instead.

### Common patterns

| Pattern                | Example                                                             | `configSource`    |
| ---------------------- | ------------------------------------------------------------------- | ----------------- |
| Binary + env var       | `augment-cli.detector.ts` — `which('auggie')` + `AUGMENT_AGENT`     | `'env'`           |
| File existence         | `devin.detector.ts` — `fs.access('/opt/.devin')`                    | none (deliberate) |
| Binary + multiple env  | `junie.detector.ts` — `JUNIE_DATA` or `JUNIE_SHIM_PATH`             | `'env'`           |
| Binary + name override | `cursor.detector.ts` — returns `cursor-cli` when `CURSOR_AGENT` set | none (not set)    |
| Config dir             | `orca.detector.ts` — `configSourceFromDir('~/.orca')`               | `'config-dir'`    |
| Runtime probe          | `acpx.detector.ts` — runs `acpx list`, non-empty output             | `'probe'`         |

### Available helpers from `src/detect/utils.js`

- `which(cmd)` — find binary in PATH, returns absolute path or null
- `getVersion(binary, args?, timeout?)` — run `<binary> --version`, returns version string or null. stdout is authoritative; stderr is tried only when stdout has no dotted-version match (many CLIs print their version banner to stderr). When neither matches, returns raw trimmed stdout. `timeout` (ms) overrides the default `VERSION_PROBE_TIMEOUT`.
- `withConfigSource(agent, source)` — attach `configSource` to the result when a source is known (adds the field only when truthy)
- `configSourceFromDir(dir)` — returns `'config-dir'` when the dir exists, else `undefined`
- `getPlatform()` — `process.platform` (mockable in tests), from `src/detect/platform.ts`

### Mocking in tests

Copy the mock header from an existing detector test whose shape matches
yours — there's no need to write one from scratch:

- `tests/detectors/rovodev.detector.test.ts` — static `vi.mock` factory
  stubbing only the helpers the detector imports
- `tests/detectors/acpx.detector.test.ts` — static factory plus `vi.hoisted`
  shared mocks
- `tests/detectors/invariant.test.ts` — no `utils.js` mock at all: it stubs
  the OS seams (`node:child_process`, `node:fs/promises`, `platform.js`) so
  every helper runs real

Whatever you copy, the factory must provide every helper the detector
imports — a blank replacement mock leaves them `undefined` and the detector
throws at runtime. If your detector imports `withConfigSource` /
`configSourceFromDir`, mock the OS seams (invariant style) or add a static
stand-in; avoid the dynamic `importOriginal` spread.

## After Adding

1. Add a test in `tests/detectors/<name>.detector.test.ts` covering both the
   detected and not-detected paths. Assert **both** fields: when `isConfigured`
   is truthy, `configSource` maps to the expected value; when falsy, it is
   `undefined`.
2. Keep `tests/detectors/invariant.test.ts` green.
3. Run the full CI sequence, in order:

   ```bash
   npm run format:check
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

   `build` (`tsc` emit) is a gate distinct from `typecheck` (`tsc --noEmit`) — passing one does not prove the other.

4. Add the agent to the README's [Supported Agents](../../README.md#supported-agents) list, and note the platforms you verified on.

## Pitfalls

- **`curly: ['error', 'all']`** — the repo bans single-line `if (x) return;`. Write braces from the start.
- **Fix ordering** — `eslint --fix` can break prettier formatting. Order: write code → `eslint --fix` on touched files → `prettier --write` on the same files → re-run both `npm run lint` and `npm run format:check`.
- **Never put unexpanded `%LOCALAPPDATA%`-style literals in a path array** — `fs.access` does not expand them. Resolve via `process.env` at runtime and skip the candidate when the var is unset.
- **Verify the real binary name before using it in `which()`** — product, cask, and binary names differ: T3 Code's cask is `t3-code`, its CLI binary is `t3`; `which('t3-code')` finds nothing.
- **`which`/`where` matches exactly, not by pattern** — `where t3` finds only executables literally named `t3.exe`, not files containing "t3".
- **Electron apps launch a GUI on `--version`** — `getVersion` returns null; `version: undefined` is acceptable, don't fight it.
- **Conditional spreads widen `'env'` to `string`** — `...(isConfigured ? { configSource: 'env' } : {})` needs `'env' as const`; prefer `withConfigSource`.
