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

- [ ] Add more config entries (roo-code, continue, tabnine)
- [ ] Add acpx detector
- [ ] Config file detection (actual file checks, not just env vars)
- [ ] Cross-platform config paths (Windows AppData)
- [ ] Version string parsing improvements

## Phase 3: Advanced Features

- [ ] Configurable agent list (consumer can filter/extend)
- [ ] Agent discovery events / callbacks
- [ ] Caching layer (avoid re-probing on every call)
- [ ] Health check / status endpoint per agent
