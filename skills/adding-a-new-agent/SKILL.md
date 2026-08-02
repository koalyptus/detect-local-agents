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

Add an entry to `src/configs.ts` in the `detectorConfigs` array. The entry is auto-discovered at startup — no registration step.

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

1. `which(binary)` — not found → agent absent
2. `getVersion(binary, versionArgs)` — 10s timeout, null if unavailable
3. Configured check (first hit wins):
   - Any `configEnvVars` set in `process.env`?
   - `config.json` exists inside `configDir`?
   - `configDir` directory exists at all?

### Configured meaning

| Output                | Meaning                                                     |
| --------------------- | ----------------------------------------------------------- |
| `isConfigured: true`  | Auth tokens set, config files present, or config dir exists |
| `isConfigured: false` | Binary found on disk but no sign of user setup              |

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

## File-based Detector

For agents that need custom detection logic (file-existence checks, pip packages, environment markers, ACP probes).

### Convention

Create `src/detectors/<name>.detector.ts`. The file is **auto-discovered** — no import or registration needed.

- Filename must match `*.detector.ts` (or `.js`)
- Must `export default` an object implementing `AgentDetector`
- `index.ts` is excluded from auto-discovery

### Minimal example

```typescript
// src/detectors/myagent.detector.ts
import type { AgentDetector, DetectedAgent } from '../types.js';
import { which, getVersion } from '../detect-utils.js';

const detector: AgentDetector = {
  name: 'myagent',

  async detect(): Promise<DetectedAgent | null> {
    const binary = await which('myagent');
    if (!binary) return null;

    return {
      name: 'myagent',
      binary,
      version: (await getVersion(binary)) ?? undefined,
      isConfigured: /* your check */,
    };
  },
};

export default detector;
```

### Common patterns

| Pattern                | Example                                                             |
| ---------------------- | ------------------------------------------------------------------- |
| Binary + env var       | `augment-cli.detector.ts` — `which('auggie')` + `AUGMENT_AGENT`     |
| File existence         | `devin.detector.ts` — `fs.access('/opt/.devin')`                    |
| Binary + multiple env  | `junie.detector.ts` — `JUNIE_DATA` or `JUNIE_SHIM_PATH`             |
| Binary + name override | `cursor.detector.ts` — returns `cursor-cli` when `CURSOR_AGENT` set |

### Available helpers from `src/detect-utils.js`

- `which(cmd)` — find binary in PATH, returns absolute path or null
- `getVersion(binary, args?)` — run `<binary> --version`, returns version string or null
- `isWindows()` / `getPlatform()` — platform detection

## After Adding

1. Add a test in `tests/detectors/<name>.detector.test.ts`
2. Mock `../../src/detect-utils.js` if using `which`/`getVersion`
3. Run `npx vitest run --coverage` — must stay at 100%
4. Run `npx eslint .` — must be 0 errors, 0 warnings
