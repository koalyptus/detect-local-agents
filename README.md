# detect-local-agents

Detect locally installed AI agents in TypeScript. Extensible architecture to easily support new agents.

## Use Case

This package detects **what's installed**, not **how to invoke**. Use it for:

- **Setup wizards** — "We detected Claude Code. Want to use Anthropic API?"
- **Pre-fill config** — Check if API keys are already set from detected agents
- **Provider recommendation** — "You have Codex → recommend OpenAI"
- **UI awareness** — "Detected agents: claude, codex, goose"

The package answers: **"Which providers does this user already have configured?"**

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

# Only show agents with auth/configured
npx detect-local-agents --configured

# Same as default
npx detect-local-agents ls

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
  name: string; // 'claude', 'codex', 'goose', etc.
  binary: string; // absolute path
  version?: string; // detected version
  isConfigured?: boolean; // has auth ready
  isACPAgent?: boolean; // needs acpx to run
}
```

## Adding a New Agent

**Simple agents** — add a config entry in `src/configs.ts`:

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
import { which } from '../detect.js';

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

## Supported Agents (34 total)

### Simple config entries (25)

- Claude Code (`claude`)
- Codex (`codex`)
- OpenCode (`opencode`)
- Goose (`goose`)
- Hermes (`hermes`)
- Copilot (`copilot`)
- Pi (`pi`)
- Aider (`aider`)
- Cline (`cline`)
- Ollama (`ollama`)
- Grok (`grok`)
- Amp (`amp`)
- Roo Code (`roo-code`)
- Continue (`continue`)
- Tabnine (`tabnine`)
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

### File-based detectors (9)

- Antigravity (`agy` or `gemini`) ⚡ — checks agy first, falls back to gemini
- Cursor (`cursor-agent`) ⚡ — ACP
- Rovo Dev (`acli rovodev`) ⚡ — special probe
- acpx ⚡ — ACP proxy with target listing
- Orca (`orca`) ⚡
- Windsurf (`windsurf`/`codeium`) ⚡
- SWE-agent ⚡ — pip/binary detection
- mini-coding-agent ⚡ — pip detection
- OpenHands SDK ⚡ — pip detection
