# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@extedcoud/smart-components` — headless React components powered by an LLM. Minimal default DOM, consumers style everything. We ship *behavior + AI plumbing*, not styled widgets. Do NOT turn this into a styling library. No Button, no Card — every component must have AI-driven behavior to belong here.

Current v0.1 components: `SmartTextbox` (ghost-text completion, Tab accepts) and `SmartSuggestion` (combobox dropdown).

## Commands

```sh
pnpm storybook      # dev surface, :6006
pnpm test           # vitest watch
pnpm test:run       # vitest one-shot
pnpm lint           # eslint flat config (no autofix)
pnpm lint:fix
pnpm typecheck      # tsc --noEmit (separate from build)
pnpm build          # vite lib build → dist/ (multi-entry: index + 4 adapters)
pnpm build-storybook
pnpm format         # prettier --write .
pnpm pack --dry-run # inspect publish tarball
```

Run one test file: `pnpm vitest run src/components/SmartTextbox/SmartTextbox.test.tsx`
Run one test by name: `pnpm vitest run -t "Tab accepts"`

Package manager is pnpm (enforced by pnpm-workspace.yaml). esbuild is in `allowBuilds`.

## Architecture — read this before editing

### The `SmartClient` interface is the entire library's extension point

`src/provider/types.ts` defines a **capability-based** interface, not a method-bag. Every method is optional; `client.capabilities: ReadonlySet<SmartCapability>` is the source of truth for what's implemented. `protocolVersion` is checked at provider mount.

When adding a new capability (e.g. `embed`, `tools`):
1. Extend the `SmartCapability` union.
2. Add the optional method to `SmartClient` w/ its request/response types.
3. Extend `CapabilityMethodMap` in `assertCapability`.
4. **Never narrow** the existing interface — only add. Existing adapters/consumers must keep working without changes.

This is why hooks call `assertCapability(client, 'complete')` before invoking — if a consumer's adapter doesn't declare the cap, they get a clear error naming the missing capability and the ones they do support.

### Layering

```
components (SmartTextbox, SmartSuggestion)   — thin DOM wrappers
  ↓
hooks (useGhostCompletion, useSuggestionList) — fetch state machines (debounce + abort + LRU)
  ↓
provider/useSmartClient — reads context
  ↓
SmartClient (the contract)                   — implemented by adapters
```

Components are dumb. All AI logic lives in the hooks. **If you find yourself putting fetch/debounce/abort logic in a component, stop and put it in a hook** — that's the layer that's reusable for power users building their own components.

### Adapters

`src/adapters/{openai,proxy,anthropic,mock}/` — each a `SmartClient` factory. Adapters are **subpath exports only** (`@extedcoud/smart-components/adapters/<name>`); never re-exported from the main barrel. This keeps `index.js` provider-agnostic and each adapter individually tree-shakeable.

**No runtime deps.** Every adapter uses plain `fetch`. If you add a new adapter and find yourself reaching for a 3rd-party SDK, first try the provider's HTTP API directly — for chat completion endpoints it's usually ~30 lines incl. SSE parsing. Only fall back to an SDK if the API is non-trivial (function calling, file uploads, etc.) and even then: optional peer dep + `peerDependenciesMeta.optional: true` + rollup `external`. We previously had `openai` as a peer dep; dropped it because the SDK was 16 MB for one endpoint.

`createProxyClient` is the recommended prod path (consumer's backend holds the key). `createOpenAIClient` warns when run in a browser context. `createMockClient` is the canonical test/story fixture — never call live APIs from tests or Storybook.

## Test & Story conventions

- Always wrap components in `<SmartProvider client={createMockClient({ complete: fn })}>`.
- `createMockClient` declares capabilities based on which option fns you pass — pass `complete` and you get `capabilities: {'complete'}`. Match what the component under test needs.
- Test setup: `src/test-setup.ts` loads `@testing-library/jest-dom/vitest`. Vitest config is in `vite.config.ts` (`test:` key).
- Stories use deterministic mock outputs with simulated latency. No env-flagged live-API stories yet — if you add one, gate strictly.

## Build quirks

- **Types are bundled by `vite-plugin-dts` v5** (option is `bundleTypes`, not `rollupTypes` — renamed in v5). Requires `@microsoft/api-extractor` as a dev dep.
- The plugin strips the `adapters/` prefix from bundled `.d.ts` filenames — so bundled types land at `dist/openai.d.ts`, not `dist/adapters/openai.d.ts`. The `exports` map in `package.json` points at the real paths (`./dist/openai.d.ts` for types, `./dist/adapters/openai.js` for code). Don't "fix" this asymmetry without also fixing where the plugin emits.
- TS 6 vs api-extractor's bundled TS 5.9 warning is informational; ignore.
- `tsconfig.build.json` has `rootDir: src` — TS 6 requires it explicit.
- `pnpm build` runs `vite build` only. `pnpm typecheck` is a separate `tsc --noEmit` step (CI should run both).

## ESLint quirks worth knowing

`eslint-plugin-react-hooks` v7 (paired w/ React 19) is much stricter:

- **`react-hooks/set-state-in-effect`** fires on any `setState` inside `useEffect`. We have legitimate fetch state machines (`useGhostCompletion`, `useSuggestionList`, `useDebouncedValue`) that file-level disable this rule with an explanatory comment. Adding a similar hook? Same pattern — don't try to refactor around it with `useSyncExternalStore`; the state IS React state.
- **`react-refresh/only-export-components`** — provider exports the component (`SmartProvider`) and context object from separate files. The hook lives in its own file (`useSmartClient.ts`). Don't merge them back; you'll re-break fast refresh.
- **`react-hooks/refs`** — refuses the `if (!ref.current) ref.current = init()` lazy-init pattern. Use `useState(() => init())` instead (see `useLRU.ts`).

## What NOT to add

- Styling abstractions, theme systems, design tokens — wrong library.
- Components without AI behavior.
- A unified "anthropic + openai" router in core — that's an adapter's job. Core stays provider-agnostic.
- Re-exports of adapters from the main barrel — kills tree-shaking.
- Live API calls in tests or default Storybook stories.

## Unresolved decisions

See `~/.claude/plans/i-am-creating-a-recursive-moler.md` for the working plan. Open Qs at the bottom track decisions still to make (textarea support, portal dropdown, telemetry callbacks, etc.).
