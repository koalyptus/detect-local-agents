# detect-local-agents

Detect locally installed AI agents in TypeScript. Extensible architecture to easily support new agents.

## Use Case

This package detects **what's installed**, not **how to invoke**. Use it for:

- **Setup wizards** — "We detected Claude Code. Want to use Anthropic API?"
- **Pre-fill config** — Check if API keys are already set from detected agents
- **Provider recommendation** — "You have Codex → recommend OpenAI"
- **UI awareness** — "Detected agents: claude_code, codex_cli, goose"

The package answers: **"Which providers does this user already have configured?"**

## How Detection Works

Each agent has a **detector** — either a simple config entry or a custom file-based detector. All detectors run in parallel at startup.

### Config-based detectors

Most agents are detected via a simple entry in `src/config/configs.ts`:

```typescript
{
  id: 'myagent',           // stable Vercel-aligned id (required; equals name when no Vercel id)
  name: 'myagent',         // legacy display name
  binary: 'myagent',        // binary to find in PATH via `which`/`where`
  configDir: '~/.myagent',  // optional: directory whose presence = configured
}
```

The detection pipeline for each config entry:

1. **Binary check** — run `which` (Unix) or `where` (Windows) to find the binary in PATH. If not found → agent is absent.
2. **Version probe** — run `<binary> --version` (configurable via `versionArgs`). Timeout: 5 seconds.
3. **Configured check** — three checks in order; first hit wins:
   - **Env vars** — are any `configEnvVars` set? (e.g. `ANTHROPIC_API_KEY`)
   - **Config file** — does `config.json` exist in the agent's config dir?
   - **Config directory** — does `configDir` exist at all?

### File-based detectors

Agents with non-standard detection logic get a `*.detector.ts` file in `src/detectors/`. These run the same binary check but can use custom probes (file existence, pip packages, environment markers, etc.).

### Detection flow

```text
detectAgents()
|-- loadAllDetectors()
|   |-- Config-based detectors (entries from detectorConfigs)
|   |   `-- configToDetector(config)
|   |       |-- locate: binary in PATH? (which/where)
|   |       |   `-- not found -> agent not reported
|   |       |-- version: <binary> --version, 5s timeout
|   |       |   (stdout first, stderr as fallback)
|   |       `-- configuration: first hit wins
|   |           |-- env var set        -> configSource: 'env'
|   |           |-- config.json in dir -> configSource: 'config-file'
|   |           |-- config dir exists  -> configSource: 'config-dir'
|   |           `-- no signal          -> isConfigured: false
|   |
|   `-- File-based detectors (auto-discovered *.detector.ts)
|       `-- custom detector
|           |-- locate: binary check (which/where) + custom probes
|           |   (file existence, env markers, runtime exec)
|           |-- version: --version probe, 5s timeout (stdout first, stderr
|           |   as fallback; 8 of the 15 file-based detectors run one)
|           `-- configuration: evidence of setup
|               |-- env marker set        -> configSource: 'env'
|               |-- config dir exists     -> configSource: 'config-dir'
|               |-- live command output   -> configSource: 'probe'
|               `-- no evidence           -> isConfigured: false
|                   (some detectors set isConfigured: true with no
|                   configSource, e.g. devin)

All detectors run in parallel under Promise.all -- per-detector errors are
swallowed and nulls filtered out -> DetectedAgent[]
`-- CLI: table with CONFIGURED column, --configured / --json flags
```

## Install

```bash
npm install detect-local-agents
```

Then use as a library (see below) or via CLI:

```bash
npx detect-local-agents
```

### Local development

Clone the repo and install:

```bash
git clone https://github.com/your-org/detect-local-agents.git
cd detect-local-agents
npm install
```

That's it. The CLI works immediately from the project directory:

```bash
npx detect-local-agents
```

## Usage

```typescript
import { detectAgents } from 'detect-local-agents';

const agents = await detectAgents();

// Show user what's available
if (agents.length > 0) {
  console.log('Detected agents:');
  for (const agent of agents) {
    console.log(`  ${agent.id} (${agent.name}) v${agent.version ?? ''} @ ${agent.binary}`);
  }
}

// Check which providers are configured
const configured = agents.filter((a) => a.isConfigured);
```

## CLI

After install, the package ships a `detect-local-agents` binary and a `dla` shorthand:

```bash
npx detect-local-agents
npx dla            # shorthand
```

All subcommands work with both names:

```bash
# Default: print a table of detected agents (with configured status)
npx detect-local-agents

# JSON output
npx detect-local-agents --json

# Only show configured agents
npx detect-local-agents --configured

# Single-agent details (prints null if not found, exit 0)
npx detect-local-agents info claude_code

# Help
npx detect-local-agents --help
```

Exit codes:

- `0` — always (a clean run with or without agents is not an error)
- `1` — detection failed or args were invalid

## DetectedAgent

```typescript
interface DetectedAgent {
  id: string; // stable Vercel-aligned key: 'claude_code', 'codex_cli', etc.
  name: string; // legacy display name: 'claude', 'codex', etc. (nameResolver may override)
  binary: string; // absolute path to the binary
  version?: string; // version string from --version
  isConfigured?: boolean;
  configSource?: 'env' | 'config-file' | 'config-dir' | 'probe';
  isACPAgent?: boolean;
  metadata?: Record<string, unknown>;
}
```

### Field details

| Field          | Description                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| `id`           | Stable Vercel-aligned key. Use for programmatic identification.             |
| `name`         | Legacy display name. May be overridden by `nameResolver` at detection time. |
| `binary`       | Absolute path to the detected binary.                                       |
| `version`      | Output of `<binary> --version`, parsed for a semver-like string.            |
| `isConfigured` | `true` if there is a setup signal for the agent on this machine.            |
| `configSource` | How `isConfigured` was determined.                                          |
| `isACPAgent`   | `true` if the agent must be launched through acpx.                          |
| `metadata`     | Extra info from file-based detectors.                                       |

## API Reference

Everything below is exported from the package root (`import { ... } from 'detect-local-agents'`).

### `detectAgents(options?: DetectOptions)`

```typescript
async function detectAgents(options?: DetectOptions): Promise<DetectedAgent[]>;
```

Detects all locally installed AI agents. Runs every registered detector (config-based and file-based) in parallel and returns the agents that were found. Timout: 10s per detector. Returns an empty array when nothing is installed.

`options` is optional and backward-compatible:

| Field     | Type       | Default                 | Effect                                                               |
| --------- | ---------- | ----------------------- | -------------------------------------------------------------------- |
| `only`    | `string[]` | `[]`                    | Restrict to detectors whose `id` is listed. Unknown ids are ignored. |
| `probe`   | `boolean`  | `true`                  | When `false`, skip active binary probes; presence checks still run.  |
| `timeout` | `number`   | `VERSION_PROBE_TIMEOUT` | Per-probe subprocess cap in ms.                                      |

### `DetectOptions`

```typescript
interface DetectOptions {
  only?: string[]; // restrict to named detector ids
  probe?: boolean; // skip active probes when false
  timeout?: number; // per-probe subprocess cap in ms
}
```

### `AgentDetector`

```typescript
interface AgentDetector {
  /** Stable Vercel-aligned id (e.g. 'claude_code'). Must match the produced DetectedAgent.id. */
  id: string;
  detect(options?: DetectOptions): Promise<DetectedAgent | null>;
}
```

A custom detector: returns a `DetectedAgent` when the agent is present, `null` otherwise.

### `DetectorConfig`

```typescript
interface DetectorConfig {
  name: string; // legacy display name
  id: string; // stable Vercel-aligned id (e.g. 'claude_code')
  binary: string; // command name to look up in PATH
  versionArgs?: string[]; // args for --version, default ['--version']
  configEnvVars?: string[]; // env vars that indicate the agent is configured
  configDir?: string; // ~/.agent style dir; presence marks it configured
  isACPAgent?: boolean; // true if the agent is ACP-only and needs acpx
  nameResolver?: (env) => string; // override the detected agent name based on runtime env
}
```

The shape of each entry in `detectorConfigs`. The optional `nameResolver` allows a single binary to report different agent names depending on environment (e.g. Claude Code reports as "cowork" when `CLAUDE_CODE_IS_COWORK` is set).

### `detectorConfigs`

```typescript
const detectorConfigs: DetectorConfig[];
```

The built-in registry of simple config-based detectors. Add a new simple agent here — see [Adding a New Agent](#adding-a-new-agent).

### `isAgentDetector()`

```typescript
function isAgentDetector(obj: unknown): obj is AgentDetector;
```

Type guard for runtime-validating that an object implements the `AgentDetector` interface.

## Adding a New Agent

**Simple agents** — add a config entry in `src/config/configs.ts`:

```typescript
{
  id: 'myagent_id',       // Vercel-aligned id (required)
  name: 'myagent',        // legacy display name
  binary: 'myagent',
  configEnvVars: ['MYAGENT_API_KEY'],
}
```

**Complex agents** (ACP, special probes) — add a `.detector.ts` file in `src/detectors/`:

```typescript
// src/detectors/myagent.detector.ts
import type { AgentDetector, DetectedAgent } from '../types.js';
import { which } from '../detect/utils.js';

const detector: AgentDetector = {
  id: 'myagent_id',

  async detect(): Promise<DetectedAgent | null> {
    const binary = await which('myagent');
    if (!binary) return null;
    return { id: 'myagent_id', name: 'myagent', binary };
  },
};

export default detector;
```

## Supported Agents

### Config-based

- Claude Code (`claude_code`) — also reports as "cowork" when `CLAUDE_CODE_IS_COWORK` is set
- Codex (`codex_cli`)
- OpenCode (`open_code`)
- Goose (`goose`)
- Hermes (`hermes`)
- GitHub Copilot (`github-copilot`)
- Pi (`pi`)
- Aider (`aider`)
- Cline (`cline`)
- Ollama (`ollama`)
- Grok (`grok`)
- Amp (`amp`)
- Roo Code (`roo-code`)
- Continue (`continue`)
- Tabnine (`stardrop`)
- Kimi Code CLI (`kimi`)
- Kiro (`kiro`)
- MiMoCode (`mimocode`)
- OpenHands (`openhands`)
- Qwen Code (`qwen`)
- CoPaw (`copaw`)
- Mercury (`mercury`)
- nanobot (`nanobot`)
- OpenClaw (`openclaw`)
- QwenPaw (`qwenpaw`)

### File-based

- Cursor (`cursor-agent`) — also reports as "cursor-cli" when in agent-exec mode ⚡
- Devin — file-based check at `/opt/.devin` ⚡
- Replit (`replit`) — binary + `REPL_ID` env ⚡
- Augment CLI (`auggie`) — binary + `AUGMENT_AGENT` env ⚡
- Junie (`junie`) — binary + `JUNIE_DATA` env ⚡
- Antigravity (`agy` or `gemini`) ⚡
- Rovo Dev (`acli rovodev`) ⚡
- acpx ⚡
- Orca (`orca`) ⚡
- Windsurf (`windsurf`/`codeium`) ⚡
- SWE-agent ⚡
- LM Studio (`lms`) ⚡
- mini-coding-agent ⚡
- OpenHands SDK ⚡
- T3 Code (`t3-code`) ⚡

## Contributing

Contributions are more than welcome — new agents, new detectors, and bug reports. Development requires Node >= 20 (`engines` in `package-json`).

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to run the checks, the coverage gate, how
to add an agent, and how to report a detection bug.
