# detect-local-agents Roadmap

## Phase 1: Core + Config-Based Detectors

> Foundation and agents via config.

- [x] Initialize package (package.json, tsconfig, vitest, eslint, prettier)
- [x] Create types (DetectedAgent, AgentDetector, DetectorConfig)
- [x] Binary detection utilities (which, getVersion)
- [x] Config-based detector engine
- [x] File-based detectors for special cases (cursor ACP, rovodev probe)
- [x] detectAgents() entry point
- [x] README + build verification
- [x] PR

## Phase 2: More Agents + Config Detection

- [x] Add more config entries (roo-code, continue, tabnine)
- [x] Add acpx detector
- [x] Config file detection (actual file checks, not just env vars)
- [x] Cross-platform config paths (Windows AppData)
- [x] Version string parsing improvements

## Phase 3: CLI

- [x] Add `src/cli.ts` (yargs) with `detect`, `ls`, `info` commands
- [x] Add `bin` entry in `package.json` so `npx detect-local-agents` works
- [x] JSON + table output formats
- [x] Update README with CLI usage

## Phase 4: Agent Expansion

> [Jul 2026] Massive agent coverage — 30+ agents total.

- [x] Add config entries for 15+ new agents (Kimi Code CLI, OpenHands, Qwen Code, Orca, Windsurf, etc.)
- [x] File-based detectors for pip packages (swe-agent, mini-coding-agent, OpenHands SDK)
- [x] File-based detectors for IDE agents (Orca, Windsurf)
- [x] Enriched Aider detection (config dir, AIDER_ env vars, version)
- [x] Pip detection utility
- [ ] Add regression tests for new detectors
- [ ] Documentation update
- [ ] PR

## Phase 5: Bug Fixes, Polish & Productionize

> [Future] Harden and ship with confidence.

- [ ] Fix coverage gaps and edge cases
- [ ] Harden error handling (detector timeouts, malformed config files)
- [ ] Improve cross-platform detection (Windows AppData, WSL paths)
- [ ] CI reliability and lint enforcement
- [ ] Audit docs, generate API reference
- [ ] Real-world testing on Windows/macOS/Linux
- [ ] npm publish
