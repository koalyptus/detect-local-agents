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

- [ ] Add `src/cli.ts` (yargs) with `detect`, `ls`, `info` commands
- [ ] Add `bin` entry in `package.json` so `npx detect-local-agents` works
- [ ] JSON + table output formats
- [ ] Update README with CLI usage

## Phase 4: Advanced Features

- [ ] Configurable agent list (consumer can filter/extend)
- [ ] Agent discovery events / callbacks
- [ ] Caching layer (avoid re-probing on every call)
- [ ] Health check / status endpoint per agent
