# Researched AI Coding Agents — Detection Reference

> Compiled 2026-07-29 for the `detect-local-agents` project.
> Sources: GitHub repos, PyPI, npm, official documentation, product websites.
> For each agent: binary name, config directory, config file paths, API key env vars.

---

## 1. MiMoCode (Xiaomi)

| Field            | Value                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| **Binary**       | `mimocode`                                                                  |
| **Install**      | `npm install -g mimocode` (npm package: mimocode)                           |
| **Config dir**   | `~/.config/mimocode/` or `~/.mimocode/`                                     |
| **Config files** | `~/.config/mimocode/config.yaml` (LLM provider config, model settings)      |
| **Env vars**     | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` (per provider used) |
| **Detection**    | `which mimocode` or check npm global packages                               |
| **Notes**        | Fork of OpenCode by Xiaomi. Terminal-native AI coding agent.                |

---

## 2. Orca (YC-backed desktop agent IDE)

| Field            | Value                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Binary**       | N/A (desktop app — Electron/IDE)                                                                                                                 |
| **Install**      | Desktop download from https://orca.app                                                                                                           |
| **Config dir**   | `~/.orca/` or platform-specific app data dir                                                                                                     |
| **Config files** | Likely `~/.orca/config.json` (inferred)                                                                                                          |
| **Env vars**     | Unknown                                                                                                                                          |
| **Detection**    | Check for app bundle / `.desktop` entry; not a CLI tool                                                                                          |
| **Notes**        | YC-backed desktop agent IDE that orchestrates 30+ coding agents side by side. No public standalone CLI. Uses ACP (Agent Communication Protocol). |

---

## 3. OpenHands (AI Software Dev Agent, formerly OpenDevin)

| Field            | Value                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Binary**       | `openhands`                                                                                                                                                 |
| **Install**      | `pip install openhands` (PyPI), or `curl -fsSL https://install.openhands.dev/install.sh \| sh` (standalone binary)                                          |
| **Config dir**   | `~/.openhands/`                                                                                                                                             |
| **Config files** | `~/.openhands/condenser_config.toml` (agent settings), `~/.openhands/cli.toml` (CLI/TUI prefs), `~/.openhands/mcp.json` (MCP server config)                 |
| **Env vars**     | `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL` (in opt-in via `--override-with-envs`), `OPENHANDS_API_KEY`                                                      |
| **Detection**    | `which openhands` or `pip show openhands`                                                                                                                   |
| **Notes**        | v1.16.0. Terminal UI (TUI), headless, IDE integration (ACP), web GUI, and server modes. Config created on first run. GitHub: github.com/OpenHands/OpenHands |

---

## 4. OpenHands Software Agent SDK (Python SDK)

| Field            | Value                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Binary**       | N/A (SDK, not a CLI tool)                                                                                                                   |
| **Install**      | `pip install openhands-sdk`                                                                                                                 |
| **Config dir**   | `~/.openhands/` (shared with OpenHands CLI)                                                                                                 |
| **Config files** | Same as OpenHands — `~/.openhands/config.toml`                                                                                              |
| **Env vars**     | `OPENHANDS_API_KEY`                                                                                                                         |
| **Detection**    | `pip show openhands-sdk`                                                                                                                    |
| **Notes**        | v1.38.0. Python SDK for building AI agents and agent workflows. No standalone binary — used programmatically (`from openhands import ...`). |

---

## 5. Open SWE (LangChain's open-source async cloud coding agent)

| Field            | Value                                                                                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Binary**       | Unknown — likely `openswe` or no standalone binary                                                                                                                                      |
| **Install**      | Unclear — likely LangChain/LangGraph-based, may not have standalone install                                                                                                             |
| **Config dir**   | Unknown                                                                                                                                                                                 |
| **Config files** | Unknown                                                                                                                                                                                 |
| **Env vars**     | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (inferred from LangChain convention)                                                                                                              |
| **Detection**    | Search for `openswe` in pip/list; check LangChain ecosystem                                                                                                                             |
| **Notes**        | Not found on PyPI as `openswe`. LangChain's entry in this space may be through LangGraph or other agent frameworks rather than a standalone agent binary. Further investigation needed. |

---

## 6. Proliferate (open-source local and cloud agent IDE)

| Field            | Value                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| **Binary**       | Unknown — likely desktop app, not CLI                                                           |
| **Install**      | Desktop download or container                                                                   |
| **Config dir**   | `~/.proliferate/` (inferred)                                                                    |
| **Config files** | Unknown                                                                                         |
| **Env vars**     | Unknown                                                                                         |
| **Detection**    | Search for proliferate in system processes or check for binary                                  |
| **Notes**        | Not found on npm or PyPI. May be a Docker-based or Electron-based IDE. Further research needed. |

---

## 7. Qwen Code (Alibaba's open-source terminal-native AI coding agent)

| Field            | Value                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Binary**       | Unknown — possibly `qwen-code` or part of qwen ecosystem                                                                  |
| **Install**      | Unknown — possibly pip package not yet public                                                                             |
| **Config dir**   | Unknown                                                                                                                   |
| **Config files** | Unknown                                                                                                                   |
| **Env vars**     | `DASHSCOPE_API_KEY` (Alibaba cloud API key)                                                                               |
| **Detection**    | Check for qwen-related binaries in path                                                                                   |
| **Notes**        | Not found on PyPI as `qwen-code` or `qwen_code`. Qwen model family is from Alibaba. May be a separate tool or unreleased. |

---

## 8. Windsurf (AI-native IDE by Codeium with agentic Cascade flows)

| Field            | Value                                                                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Binary**       | `windsurf` (IDE launcher)                                                                                                                                                                          |
| **Install**      | Desktop download from https://codeium.com/windsurf (now redirects to devin.ai)                                                                                                                     |
| **Config dir**   | Platform-specific app data                                                                                                                                                                         |
| **Config files** | IDE settings in platform app data dir                                                                                                                                                              |
| **Env vars**     | `CODEIUM_API_KEY`                                                                                                                                                                                  |
| **Detection**    | Check for `windsurf` binary; check `/Applications/Windsurf.app` or platform equivalent                                                                                                             |
| **Notes**        | Desktop IDE with "Cascade" agentic flow. Windsurf was acquired by / merged with Devin (Cognition). No public standalone CLI. The `windsurf` PyPI package is unrelated (utility package by owlvin). |

---

## 9. SWE-agent (Princeton's software engineering agent)

| Field            | Value                                                                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Binary**       | `sweagent`                                                                                                                                                                        |
| **Install**      | `pip install sweagent` (PyPI: `sweagent`)                                                                                                                                         |
| **Config dir**   | `~/.sweagent/` or `./config/` (relative to workspace)                                                                                                                             |
| **Config files** | `~/.sweagent/config.yaml` or `./config/default.yaml` (in repo), `./.env`                                                                                                          |
| **Env vars**     | `GITHUB_TOKEN` (for GitHub API operations), `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`                                                                                                 |
| **Detection**    | `which sweagent` or `pip show sweagent`                                                                                                                                           |
| **Notes**        | v0.0.1 on PyPI. NeurIPS 2024 paper. Takes GitHub issues and auto-fixes them. Note: development has shifted to mini-swe-agent as successor. GitHub: github.com/SWE-agent/SWE-agent |

---

## 10. Kiro (AWS's spec-driven AI coding IDE)

| Field            | Value                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Binary**       | `kiro` (CLI), also desktop IDE                                                                                                                               |
| **Install**      | Desktop download from https://kiro.dev or CLI install script                                                                                                 |
| **Config dir**   | `~/.kiro/`                                                                                                                                                   |
| **Config files** | `~/.kiro/config.yaml` (project/system config), spec files in workspace                                                                                       |
| **Env vars**     | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (for AWS integration); provider-specific API keys as needed                                       |
| **Detection**    | `which kiro` or check for Kiro desktop app                                                                                                                   |
| **Notes**        | Spec-driven AI coding IDE from AWS. CLI available for CI/CD integration. Requires AWS account for some features. GitHub/Framework: Not open source publicly. |

---

## 11. Devin (Cognition's autonomous software engineer)

| Field            | Value                                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Binary**       | N/A (SaaS product, desktop app)                                                                                                                                                          |
| **Install**      | Desktop download from https://devin.ai                                                                                                                                                   |
| **Config dir**   | Platform-specific app data dir                                                                                                                                                           |
| **Config files** | IDE settings in app data (Electron-based)                                                                                                                                                |
| **Env vars**     | `DEVIN_API_KEY` (for API access), GitHub token, provider keys                                                                                                                            |
| **Detection**    | Check for Devin desktop app; check env vars                                                                                                                                              |
| **Notes**        | SaaS autonomous software engineer. Desktop app for Devin Devin. No public CLI binary. Config is cloud-managed. Windsurf.com now redirects to devin.ai/desktop (acquisition/partnership). |

---

## 12. mini-coding-agent (Sebastian Raschka's minimal Python coding agent)

| Field            | Value                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Binary**       | `mini-coding-agent`                                                                                                                                                 |
| **Install**      | `pip install mini-coding-agent` (PyPI), or `uv run mini-coding-agent`                                                                                               |
| **Config dir**   | `./.agent-sessions/` (session data in current working directory)                                                                                                    |
| **Config files** | `./.agent-sessions/<session_id>/` (per-session state), minimal config                                                                                               |
| **Env vars**     | None specific — uses Ollama (default: `http://localhost:11434`)                                                                                                     |
| **Detection**    | `which mini-coding-agent` or `pip show mini-coding-agent`                                                                                                           |
| **Notes**        | v0.1.0. Ultra-minimal coding agent (~a few hundred lines). Uses Ollama by default. Created by Sebastian Raschka (rasbt). GitHub: github.com/rasbt/mini-coding-agent |

---

## 13. OpenClacky (token-efficient open-source AI coding agent)

| Field            | Value                                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Binary**       | Unknown — possibly `openclacky` or `clacky`                                                                                                                       |
| **Install**      | Unknown — not found on PyPI                                                                                                                                       |
| **Config dir**   | Unknown                                                                                                                                                           |
| **Config files** | Unknown                                                                                                                                                           |
| **Env vars**     | Unknown — likely uses standard provider API keys                                                                                                                  |
| **Detection**    | Search for `openclacky` or `clacky` in path                                                                                                                       |
| **Notes**        | Token-efficient open-source AI coding agent. Not found on PyPI (`openclacky` returned 404). May be a very new project or not yet published to package registries. |

---

## 14. CoPaw (Alibaba/AgentScope's open-source personal AI agent)

| Field            | Value                                                                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Binary**       | `copaw`                                                                                                                                                                            |
| **Install**      | `pip install copaw`, or `curl -fsSL https://copaw.agentscope.io/install.sh \| bash`                                                                                                |
| **Config dir**   | `~/.copaw/`                                                                                                                                                                        |
| **Config files** | `~/.copaw/config.yaml` (model config, channel config, skill config)                                                                                                                |
| **Env vars**     | `COP_A_API_KEY`, `OPENAI_API_KEY`, `DASHSCOPE_API_KEY`, `ANTHROPIC_API_KEY` (per provider), channel-specific webhook tokens                                                        |
| **Detection**    | `which copaw` or `pip show copaw`                                                                                                                                                  |
| **Notes**        | v1.0.2 by AgentScope (Alibaba). Personal AI assistant — deploy locally or in cloud. Multi-channel (DingTalk, Feishu, WeChat, Discord, Telegram, etc.). Skills-based extensibility. |

---

## 15. Mercury Agent (soul-driven personal AI agent)

| Field            | Value                                                                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Binary**       | Unknown                                                                                                                                                                                                                  |
| **Install**      | Unknown — not found as expected PyPI package                                                                                                                                                                             |
| **Config dir**   | Unknown                                                                                                                                                                                                                  |
| **Config files** | Unknown                                                                                                                                                                                                                  |
| **Env vars**     | Unknown                                                                                                                                                                                                                  |
| **Detection**    | Not yet identifiable on major package registries                                                                                                                                                                         |
| **Notes**        | "Soul-driven personal AI agent" — the `mercury-agent` on PyPI (v0.1.10, 2019) is an unrelated hardware library. The actual "Mercury Agent" described here may be a new project not yet on PyPI. Further research needed. |

---

## 16. nanobot (HKU Data Science Lab's ultra-lightweight personal AI agent)

| Field            | Value                                                                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Binary**       | `nanobot` (via pip package `nanobot-ai`)                                                                                                                                                                                                   |
| **Install**      | `pip install nanobot-ai`, or `curl -fsSL https://raw.githubusercontent.com/HKUDS/nanobot/main/scripts/install.sh \| sh`                                                                                                                    |
| **Config dir**   | `~/.nanobot/`                                                                                                                                                                                                                              |
| **Config files** | `~/.nanobot/config.yaml` (providers, channels, tools, memory), `~/.nanobot/memory/`                                                                                                                                                        |
| **Env vars**     | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` (per provider), Telegram/Discord/Slack bot tokens                                                                                                                                  |
| **Detection**    | `which nanobot` or `pip show nanobot-ai`                                                                                                                                                                                                   |
| **Notes**        | v0.3.0 (alpha) by HKU Data Science Lab (Xubin Ren et al.). Ultra-lightweight personal AI agent. WebUI, terminal, multi-channel (Telegram, Discord, Slack, WeChat, etc.), MCP, memory, long-horizon goals. GitHub: github.com/HKUDS/nanobot |

---

## 17. OpenHuman (local-first personal AI agent)

| Field            | Value                                                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Binary**       | Unknown — not found as expected                                                                                                                                                                   |
| **Install**      | Unknown                                                                                                                                                                                           |
| **Config dir**   | Unknown                                                                                                                                                                                           |
| **Config files** | Unknown                                                                                                                                                                                           |
| **Env vars**     | Unknown                                                                                                                                                                                           |
| **Detection**    | Not yet identifiable — possibly unreleased or very new                                                                                                                                            |
| **Notes**        | "Local-first personal AI agent" — the `openhuman` PyPI package (v1.1.3, 2023) is an unrelated virtual human assistant by OpenHuman.ai. The agent described here may be a different/newer project. |

---

## 18. OpenClaw (open-source personal AI agent)

| Field            | Value                                                                                                                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Binary**       | `openclaw` (SDK library, not standalone CLI)                                                                                                                                                                                |
| **Install**      | `pip install openclaw`                                                                                                                                                                                                      |
| **Config dir**   | Programmatic — config managed via code                                                                                                                                                                                      |
| **Config files** | No standard config file; uses `api_key` parameter                                                                                                                                                                           |
| **Env vars**     | `CMDOP_API_KEY` (for CMDOP platform)                                                                                                                                                                                        |
| **Detection**    | `pip show openclaw`                                                                                                                                                                                                         |
| **Notes**        | v2026.3.20 by markolofsen/CMDOP. Agent orchestration framework, not a standalone personal AI agent. Different from the described "open-source personal AI agent". Further investigation needed to find the correct project. |

---

## 19. QwenPaw (Alibaba's Qwen-powered personal AI agent)

| Field            | Value                                                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Binary**       | `qwenpaw`                                                                                                                                                                                                                                                     |
| **Install**      | `pip install qwenpaw`                                                                                                                                                                                                                                         |
| **Config dir**   | `~/.qwenpaw/`                                                                                                                                                                                                                                                 |
| **Config files** | `~/.qwenpaw/config.yaml` (model config, providers, channels, skills)                                                                                                                                                                                          |
| **Env vars**     | `QWENPAW_API_KEY`, `DASHSCOPE_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (per provider), channel-specific tokens                                                                                                                                         |
| **Detection**    | `which qwenpaw` or `pip show qwenpaw`                                                                                                                                                                                                                         |
| **Notes**        | v2.0.1 by AgentScope (Alibaba). Very actively developed (Jul 2026 release). Personal AI assistant with QwenPaw-Flash models (2B/4B/9B). Multi-channel, ReMe memory, coding mode, local-first. Agent OS architecture. GitHub: github.com/agentscope-ai/QwenPaw |

---

## 20. Trustclaw (ComposioHQ's self-hostable personal AI agent)

| Field            | Value                                                                                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Binary**       | `trustclaw` (SDK library)                                                                                                                                                                 |
| **Install**      | `pip install trustclaw`                                                                                                                                                                   |
| **Config dir**   | Programmatic — config managed via code                                                                                                                                                    |
| **Config files** | No standard config file; uses `api_key` parameter                                                                                                                                         |
| **Env vars**     | `CMDOP_API_KEY` (for CMDOP platform)                                                                                                                                                      |
| **Detection**    | `pip show trustclaw`                                                                                                                                                                      |
| **Notes**        | v2026.3.20 by markolofsen/CMDOP. Secure remote agent execution with audit logging and sandboxing. Library for Python, not a standalone CLI agent. GitHub: associated with CMDOP platform. |

---

## Quick Reference: Detection Strategies

### By package manager

```typescript
// npm global packages
const npmAgents: Record<string, string> = {
  mimocode: 'mimocode',
};

// pip packages
const pipAgents: Record<string, [pkgName: string, binary: string]> = {
  openhands: ['openhands', 'openhands'],
  sweagent: ['sweagent', 'sweagent'],
  'mini-coding-agent': ['mini-coding-agent', 'mini-coding-agent'],
  copaw: ['copaw', 'copaw'],
  'nanobot-ai': ['nanobot-ai', 'nanobot'],
  qwenpaw: ['qwenpaw', 'qwenpaw'],
  'openhands-sdk': ['openhands-sdk', null], // no binary
  openclaw: ['openclaw', null], // library, no binary
  trustclaw: ['trustclaw', null], // library, no binary
};

// Desktop apps (check for binary or app bundle)
const desktopApps = ['orca', 'windsurf', 'devin', 'kiro', 'proliferate'];
```

### By executable in PATH

```typescript
const cliAgents = [
  'mimocode',
  'openhands',
  'sweagent',
  'mini-coding-agent',
  'copaw',
  'nanobot',
  'qwenpaw',
  'kiro',
];
```

### By config directory exists

```typescript
const configDirs = [
  { name: 'MiMoCode', path: '~/.config/mimocode' },
  { name: 'OpenHands', path: '~/.openhands' },
  { name: 'SWE-agent', path: '~/.sweagent' },
  { name: 'CoPaw', path: '~/.copaw' },
  { name: 'nanobot', path: '~/.nanobot' },
  { name: 'QwenPaw', path: '~/.qwenpaw' },
  { name: 'Kiro', path: '~/.kiro' },
];
```

---

## Agents Requiring Further Research

The following could not be definitively identified on PyPI/npm/GitHub with the tooling available:

| Agent             | Notes                                                                            |
| ----------------- | -------------------------------------------------------------------------------- |
| **Orca**          | YC desktop agent IDE — no public CLI binary; likely an Electron/desktop app only |
| **Open SWE**      | LangChain's async cloud agent — may not have standalone install                  |
| **Proliferate**   | Not found on standard registries                                                 |
| **Qwen Code**     | Not found on PyPI; may be unreleased or branded differently                      |
| **OpenClacky**    | Not found on PyPI; may be early stage                                            |
| **Mercury Agent** | "mercury-agent" PyPI package is unrelated; correct project not found             |
| **OpenHuman**     | "openhuman" PyPI package is unrelated; correct project not found                 |
| **OpenClaw**      | "openclaw" PyPI is a CMDOP orchestration framework, not the described agent      |

> For these agents, consider adding detection stubs that check for their binary name in PATH and their config directory. The table documents the _expected_ detection signatures to try.
