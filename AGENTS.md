# AGENTS.md

Guidance for AI coding agents working in this repo.

## What this is

`detect-local-agents` detects locally installed AI coding agents. `detectAgents(options?: DetectOptions)`
loads every detector (config entries + auto-discovered `*.detector.ts` modules) and
runs them concurrently, returning `DetectedAgent[]`. It is a published npm package
(`detect-local-agents`).

## Before opening a PR

Run the same five checks CI runs, in order, with one command:

```bash
npm run verify
```

`verify` chains `format:check → lint → typecheck → test → build` (stops at first
failure). Coverage is enforced at **100%** (branches/functions/lines/statements) in
`vitest.config.ts` — an untested branch fails `npm test` locally, not just in CI.

## Key conventions

- **Adding a new agent:** read `skills/adding-a-new-agent/SKILL.md` first. It encodes
  the config-vs-detector decision, the `configSource` contract, the test-mocking
  pattern, and the pitfalls that have bitten previous contributors.
- **Detection controls** are passed via `DetectOptions` threaded through
  `detect(options?)`. Do **not** introduce module-level setter functions or other
  global mutable state to pass options into detectors.
- **Backward compatibility:** `detectAgents()` with no arguments must keep returning
  the same agents. Additive changes only.
- **TypeScript** throughout (`src/`, compiled by `tsc`). Per-file `// path/to/file`
  banner comments are not used.

## Docs to consult

- `CONTRIBUTING.md` — workflow, verify gate, coverage, commit style.
- `README.md` — API reference (`detectAgents`, `DetectOptions`, `DetectedAgent`,
  `AgentDetector`, `DetectorConfig`) and detection semantics.
- `ROADMAP.md` — phase/sub-phase plan (7a–7e cover the detection-controls work).
