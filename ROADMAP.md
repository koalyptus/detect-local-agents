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
- [x] Add regression tests for new detectors
- [x] Documentation update
- [x] PR

## Phase 5: Bug Fixes, Polish & Productionize

> Harden and ship with confidence.

- [x] Fix coverage gaps and edge cases
- [x] Harden error handling (detector timeouts, malformed config files)
- [x] Improve cross-platform detection (Windows AppData, WSL paths)
- [x] CI reliability and lint enforcement

## Phase 6: Vercel detect-agent Integration

> Leverage Vercel's declarative agent spec to expand detection coverage.

### Phase 6a: Reference & Sync

- [x] Vendor `agents.json` + `agents.schema.json` from Vercel's detect-agent repo
- [x] Add `scripts/sync-vercel-agents.sh` for upstream sync
- [x] Add `.github/workflows/check-vercel-detect-agents.yml` (fortnightly check)

### Phase 6b: New Detectors

- [x] Rename `copilot` → `github-copilot` to match Vercel's spec
- [x] Add new detectors: devin, replit, cowork, augment-cli, junie, cursor-cli
- [x] Tests for all new detectors and sync script
- [x] PR

### Phase 6c: Polish & Ship

- [ ] Audit docs, generate API reference
- [ ] Real-world testing on Windows/macOS/Linux
- [ ] npm publish

## Phase 7: Programmatic Detection Controls (g9)

> Builds on Phase 1 (`detectAgents()` entry point + detector engine) and the
> Phase 5 probe-timeout hardening (#14): expose those controls to programmatic
> callers without changing default behaviour.

- [x] `DetectOptions` (`only` / `probe` / `timeout`) added to `detectAgents(options?)` and `AgentDetector.detect(options?)`
- [x] Extends the Phase 5 probe-timeout work: `timeout` is now caller-overridable per `getVersion` and each detector's probe (default `VERSION_PROBE_TIMEOUT`)
- [x] `probe: false` skips active binary probes, keeps presence checks (`isConfigured: undefined`) — refines the detection contract from Phase 1
- [x] `only` filters detectors by static name (unknown names ignored); no new global state (replaces the rejected setter approach)
- [x] 100% coverage on new branches; README + SKILL + ROADMAP synced
- [x] PR #16
