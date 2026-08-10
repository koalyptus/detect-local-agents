# detect-local-agents

Detect locally installed AI agents in TypeScript. Extensible architecture to easily support new agents.

## Use Case

This package detects **what's installed**, not **how to invoke**. Use it for:

- **Setup wizards** — "We detected Claude Code. Want to use Anthropic API?"
- **Pre-fill config** — Check if API keys are already set from detected agents
- **Provider recommendation** — "You have Codex → recommend OpenAI"
- **UI awareness** — "Detected agents: claude, codex, goose"

The package answers: **"Which providers does this user already have configured?"**

## How Detection Works

Each agent has a **detector** — either a simple config entry or a custom file-based detector. All detectors run in parallel at startup.

### Config-based detectors

Most agents are detected via a simple entry in `src/config/configs.ts`:

```typescript
{
  name: 'ollama',
  binary: 'ollama',        // binary to find in PATH via `which`/`where`
  configDir: '~/.ollama',  // optional: directory whose presence = configured
}
```

The detection pipeline for each config entry:

1. **Binary check** — run `which` (Unix) or `where` (Windows) to find the binary in PATH. If not found → agent is absent.
2. **Version probe** — run `<binary> --version` (configurable via `versionArgs`). Timeout: 10 seconds.
3. **Configured check** — three checks in order; first hit wins:
   - **Env vars** — are any `configEnvVars` set? (e.g. `ANTHROPIC_API_KEY`)
   - **Config file** — does `config.json` exist in the agent's config dir?
   - **Config directory** — does `configDir` exist at all?

### File-based detectors

Agents with non-standard detection logic get a `*.detector.ts` file in `src/detectors/`. These run the same binary check but can use custom probes (file existence, pip packages, environment markers, etc.).

### Detection flow

```text
detectAgents()
`-- loadAllDetectors()
    |-- Config-based detectors (entries from detectorConfigs)
    |   `-- configToDetector(config)
    |       |-- locate: binary in PATH? (which/where)
    |       |   `-- not found -> agent not reported
    |       |-- version: <binary> --version, 10s timeout
    |       |   (stdout first, stderr as fallback)
    |       `-- configuration: first hit wins
    |           |-- env var set        -> configSource: 'env'
    |           |-- config.json in dir -> configSource: 'config-file'
    |           |-- config dir exists  -> configSource: 'config-dir'
    |           `-- no signal          -> isConfigured: false
    |
    `-- File-based detectors (auto-discovered *.detector.ts)
        `-- custom detector
            |-- locate: binary check (which/where) + custom probes
            |   (file existence, env markers, runtime exec)
            |-- version: --version probe, 10s timeout (stdout first, stderr
            |   as fallback; 8 of the 15 file-based detectors run one)
            `-- configuration: evidence of setup
                |-- env marker set        -> configSource: 'env'
                |-- config dir exists     -> configSource: 'config-dir'
                |-- live command output   -> configSource: 'probe'
                `-- no evidence           -> isConfigured: false
                    (some detectors set isConfigured: true with no
                    configSource, e.g. devin)

All detectors run in parallel under Promise.all -- per-detector errors are
swallowed and nulls filtered out -> DetectedAgent[]
`-- CLI: table with CONFIGURED column, --configured / --json flags
```

Plain text on purpose: npmjs.com does not render Mermaid, and this README doubles as the npm package page. GitHub renders this block identically.

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
    console.log(`  ${agent.name} ${agent.version ?? ''} @ ${agent.binary}`);
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
npx detect-local-agents info claude

# Help
npx detect-local-agents --help
```

Exit codes:

- `0` — always (a clean run with or without agents is not an error)
- `1` — detection failed or args were invalid

## DetectedAgent

```typescript
interface DetectedAgent {
  name: string; // 'claude', 'codex', 'ollama', etc.
  binary: string; // absolute path to the binary
  version?: string; // version string from --version (null if probe timed out)
  isConfigured?: boolean; // true if any setup signal exists (see below)
  configSource?: 'env' | 'config-file' | 'config-dir' | 'probe'; // how isConfigured was determined (see below)
  isACPAgent?: boolean; // needs acpx to run
  metadata?: Record<string, unknown>; // extra info from file-based detectors
}
```

### Field details

| Field          | Description                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`         | Agent identifier matching Vercel's `detect-agent` spec where applicable.                                                                                                                                                                                                                                                                                                                     |
| `binary`       | Absolute path to the detected binary. Cross-platform: forward slashes on Unix, backslashes on Windows.                                                                                                                                                                                                                                                                                       |
| `version`      | Output of `<binary> --version`, parsed for a semver-like string. `null` if the probe timed out (10s) or the binary doesn't support `--version`.                                                                                                                                                                                                                                              |
| `isConfigured` | `true` if there is a setup signal for the agent on this machine — checked in order: an env var is set (`ANTHROPIC_API_KEY`, etc.), a config file exists (`config.json` in the agent's config dir), or the config directory exists. It is evidence the agent was set up, not proof the credentials are valid or working. `false` means the binary is installed but no setup signal was found. |
| `configSource` | How `isConfigured` was determined: `'env'` (an env var is set), `'config-file'` (a config file exists), `'config-dir'` (the config directory exists), or `'probe'` (a runtime probe of the binary succeeded — used by `acpx` and `rovodev`). Only present when `isConfigured` is `true`. Earlier in the list = stronger evidence.                                                            |
| `isACPAgent`   | `true` if the agent speaks the Agent Communication Protocol and must be launched through `acpx`.                                                                                                                                                                                                                                                                                             |
| `metadata`     | Arbitrary data from file-based detectors (e.g. pip package versions, ACP target lists). Not set by config-based detectors.                                                                                                                                                                                                                                                                   |

## API Reference

Everything below is exported from the package root (`import { ... } from 'detect-local-agents'`).

### `detectAgents()`

```typescript
async function detectAgents(): Promise<DetectedAgent[]>;
```

Detects all locally installed AI agents. Runs every registered detector (config-based and file-based) in parallel and returns the agents that were found. Detectors that error or time out (10s per detector) are skipped silently. Returns an empty array when nothing is installed.

### `DetectedAgent`

See [DetectedAgent](#detectedagent) above.

### `AgentDetector`

```typescript
interface AgentDetector {
  name: string;
  detect(): Promise<DetectedAgent | null>;
}
```

A custom detector: returns a `DetectedAgent` when the agent is present, `null` otherwise.

### `DetectorConfig`

```typescript
interface DetectorConfig {
  name: string;
  binary: string; // command name to look up in PATH
  versionArgs?: string[]; // args for --version, default ['--version']
  configEnvVars?: string[]; // env vars that indicate the agent is configured
  configDir?: string; // ~/.agent style dir; presence marks it configured
  isACPAgent?: boolean; // true if the agent is ACP-only and needs acpx
  nameResolver?: (env: Record<string, string | undefined>) => string;
  // override the detected name based on runtime env
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
  name: 'myagent',
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
  name: 'myagent',
  async detect(): Promise<DetectedAgent | null> {
    const binary = await which('myagent');
    if (!binary) return null;
    return { name: 'myagent', binary };
  },
};

export default detector;
```

## Supported Agents

### Config-based

- Claude Code (`claude`) — also reports as "cowork" when `CLAUDE_CODE_IS_COWORK` is set
- Codex (`codex`)
- OpenCode (`opencode`)
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
