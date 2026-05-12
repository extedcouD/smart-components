# Contributing

Thanks for your interest in `@extedcoud/smart-components`. This doc covers how to set up, develop, and propose changes.

## Prerequisites

- Node `>=20`
- pnpm `>=9` (`corepack enable pnpm` if you don't have it)

## Setup

```sh
git clone <repo-url>
cd smart-components
pnpm install
```

## Dev workflow

```sh
pnpm storybook      # component playground @ :6006 — primary dev surface
pnpm test           # vitest watch
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit
pnpm format         # prettier --write .
pnpm build          # produce dist/
```

Most work happens in Storybook. Add a `*.stories.tsx` next to your component and iterate there.

## Adding a component

1. Create `src/components/<Name>/`:
   - `<Name>.tsx` — implementation
   - `<Name>.module.css` — scoped styles (CSS Modules only — no external styling libs)
   - `<Name>.test.tsx` — vitest + `@testing-library/react`
   - `<Name>.stories.tsx` — CSF3 stories
   - `index.ts` — barrel: `export { Name } from './Name'; export type { NameProps } from './Name';`
2. Re-export from `src/index.ts`.
3. Run `pnpm lint && pnpm typecheck && pnpm test:run && pnpm build` — all must pass.

## Component conventions

- **Props:** extend the native element's attributes (`ButtonHTMLAttributes<HTMLButtonElement>`, etc.) so consumers get full DOM prop support.
- **`className` passthrough:** always merge consumer `className` last.
- **Refs:** forward refs where it makes sense (forms, focus management).
- **A11y:** semantic HTML first. `eslint-plugin-jsx-a11y` runs in lint — fix warnings, don't disable.
- **No runtime deps.** Library should ship with `react` / `react-dom` as the only peers.
- **Styles:** CSS Modules only. Avoid global selectors. Class names go on the root + variant slots.

## Testing

- Use `@testing-library/react` + `@testing-library/user-event`.
- Query by role/label, not by class or test-id (a11y-first).
- Cover: render, props/variants, user interaction, disabled/edge states.

## Code style

- Prettier is source of truth — run `pnpm format` before pushing.
- ESLint flat config (`eslint.config.js`) — fix, don't disable.
- `import type` for type-only imports (enforced via `@typescript-eslint/consistent-type-imports`).

## Commits

Short, imperative subject (`add Tooltip component`, `fix Button variant fallback`). Group related changes per commit. Keep the diff scoped.

## Pull requests

Before opening:

- [ ] `pnpm lint` clean
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test:run` green
- [ ] `pnpm build` succeeds and `dist/index.d.ts` reflects new exports
- [ ] New components have stories + tests
- [ ] `README.md` updated if public API changed

PR description: what, why, and (for new components) a Storybook screenshot or GIF.

## Reporting bugs

Open an issue with:
- Repro (minimal CodeSandbox/StackBlitz preferred)
- Expected vs actual
- React / Node / package versions

## Proposing new components

Open an issue first describing the use case + API sketch before sending a PR. Saves churn if scope or naming needs adjustment.

## License

By contributing you agree your contributions are licensed under the MIT License.
