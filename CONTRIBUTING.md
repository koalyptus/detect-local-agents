# Contributing

Contributions are more than welcome! New agents, new detectors, and detection bug
reports. Development requires Node >= 20 (`engines` in `package.json`).

## Questions and bug reports

Please open a
[GitHub Issue](https://github.com/koalyptus/detect-local-agents/issues) for questions,
feature ideas, and bug reports. For a **detection bug** specifically, include:

- **OS** (and version)
- **Install method** — npm / Homebrew / Volta / pnpm / bun / scoop / official installer
- **`npx detect-local-agents --json` output**
- **The binary's real location** — `which <binary>` on Unix, `where <binary>` on Windows

## Before opening a pull request

Run the same five checks CI runs, in the same order, with one command:

```bash
npm run verify
```

`verify` chains `format:check → lint → typecheck → test → build` (stopping at
the first failure), so a green local run means CI's sequence will too.

- `build` (`tsc` emit) is a gate **distinct** from `typecheck` (`tsc --noEmit`) — passing
  one does not prove the other, so CI runs both.
- Autofixers exist if a check fails: `npm run format` (prettier --write) and
  `npm run lint:fix` (eslint --fix).
- CI runs this sequence on a 3 OS × Node 20/22 matrix — 6 cells in total — so a fully
  green local run saves a full round trip.

## Test coverage

Coverage is enforced at **100%** on branches, functions, lines, and statements in
`vitest.config.ts`. An untested branch fails `npm test` locally, not just in CI. If a
line is genuinely unreachable, explain why in the PR rather than lowering the threshold.

## Adding a new agent

See [Adding a New Agent in README.md](../README.md#adding-a-new-agent) for the mechanics.
Two decisions matter:

- **Config entry vs file-based detector** — most agents are a simple config entry in
  `src/config/configs.ts` (a binary plus optional env vars and/or a config dir). Reach for
  a `*.detector.ts` file only when the agent needs custom logic: file probes, env markers,
  runtime probes.
- **What counts as "configured"?** — `isConfigured` means there is evidence of setup, not
  that auth is valid. If the agent reports a `configSource`, it must be one of
  `'env' | 'config-file' | 'config-dir' | 'probe'`.

Every new agent needs: a test covering **both** the detected and not-detected paths, an
entry in [Supported Agents](../README.md#supported-agents), and the platforms you actually
verified on (real hardware beats assumption, especially on Windows).

> **Using an AI coding agent?** Load
> [`skills/adding-a-new-agent/SKILL.md`](../skills/adding-a-new-agent/SKILL.md) before
> starting. It encodes the config-vs-detector decision, the `configSource` contract, the
> test-mocking pattern the coverage gate requires, and the pitfalls that have bitten
> previous contributors. Skill-aware tools discover it automatically from the `skills/`
> directory; other tools just need the file in context.

## Commit messages

Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, ...). Small, focused
commits are preferred over one squashed change.

## TypeScript

The codebase is fully TypeScript (source under `src/`, compiled by `tsc`). When adding or
modifying detection logic:

- Keep `AgentDetector.detect()` backward-compatible: its `options?` argument is optional, so
  existing callers (and the CLI) that call `detect()` with no arguments are unaffected.
- To add programmatic controls, extend `DetectOptions` in `src/types.ts` and thread the value
  through `detect(options)` — do **not** introduce module-level setter functions or other global
  mutable state to pass options into detectors.
- Coverage is enforced at 100% (branches/functions/lines/statements). New branches need tests
  in `tests/`; use the existing `vi.mock` + `vi.hoisted` pattern so no real binaries spawn.
