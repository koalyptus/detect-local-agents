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

## Supported Agents

- Claude Code (`claude`)
- Codex (`codex`)
- OpenCode (`opencode`)
- Goose (`goose`)
- Hermes (`hermes`)
- Cursor (`cursor-agent`) — ACP
- Rovo Dev (`acli rovodev`) — special probe
- Copilot (`copilot`)
- Pi (`pi`)
- Aider (`aider`)
- Cline (`cline`)
- Gemini (`gemini`)
- Amp (`amp`)
