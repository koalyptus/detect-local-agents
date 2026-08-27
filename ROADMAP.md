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

## Phase 7: Programmatic Detection Controls

> Expose detection controls and the supported-agent list to programmatic callers
> without changing default behaviour. Sub-phases 7a–7f.

### Phase 7a: stderr version fallback

- [x] `getVersion()` reads the CLI version from **stderr** as a fallback (many CLIs print their version banner to stderr); stdout stays authoritative
- [x] Shipped as v0.2.3

### Phase 7b: configSource + invariant

- [x] Add `DetectedAgent.configSource` (`'env' | 'config-file' | 'config-dir' | 'probe'`)
- [x] Enforce the one-directional invariant (`configSource` set ⇒ `isConfigured: true`); `devin` is the deliberate `configSource: undefined` case
- [x] Shipped as v0.3.0

### Phase 7c: which() install-dir sweep

- [x] `which()` searches well-known global install directories (npm prefix + bin dir) after the PATH/`where` miss
- [x] Docs refresh
- [x] Shipped as v0.4.0

### Phase 7d: tighter version-probe timeout

- [x] Add `VERSION_PROBE_TIMEOUT` (5s) and use it for the version probe; `which()` keeps its 10s `COMMAND_TIMEOUT`
- [x] Shipped as v0.5.0 (#14)

### Phase 7e: consumer-facing DetectOptions

- [x] `DetectOptions` (`only` / `probe` / `timeout`) added to `detectAgents(options?)` and `AgentDetector.detect(options?)` — strictly additive; omitting `options` preserves the default behaviour
- [x] `timeout` is caller-overridable per `getVersion` and each detector's probe (default `VERSION_PROBE_TIMEOUT`)
- [x] `probe: false` skips active binary probes, keeps presence checks; `acpx`/`rovodev` report `isConfigured: undefined` (consistent with the 7b invariant)
- [x] `only` filters detectors by static `AgentDetector.name` (unknown names ignored); no new global state
- [x] 100% coverage on new branches; README + SKILL + ROADMAP synced
- [x] PR #16

### Phase 7f: list-supported API + CLI flag

- [x] `SupportedAgent` interface (`{ id: string }`) and `listSupportedAgents(): Promise<SupportedAgent[]>` exported from `src/index.ts`; backed by `loadAllDetectors()` so new detectors show up automatically (no second registry)
- [x] Returns static ids only — sorted by `id` for deterministic output across platforms; no probes, no `detect()` calls. Runtime display names stay a `detectAgents()` concern (`nameResolver` is not run here)
- [x] CLI `--list-supported` flag on the default command, honouring `--json`; bypasses detection entirely
- [x] `detectorConfigs` stays exported and unchanged — the new API is strictly additive
- [x] 100% coverage on new branches; README + ROADMAP synced

## Phase 8: Polish & Ship

- [ ] Audit docs, generate API reference
- [ ] Real-world testing on Windows/macOS/Linux
- [ ] npm publish
