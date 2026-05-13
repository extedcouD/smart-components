# @extedcoud/smart-components

Headless React UI components powered by an LLM. Painfully small DOM, painfully customizable. You provide the AI client, we provide the behavior.

📖 **[Full docs + interactive demos →](https://extedcoud.github.io/smart-components/)**
🎮 **[Component playground (Storybook) →](https://extedcoud.github.io/smart-components/storybook/)**

## Install

```sh
pnpm add @extedcoud/smart-components
pnpm add react react-dom
```

Zero runtime deps beyond `react` / `react-dom` — every adapter is plain `fetch`.

## Quick start

```tsx
import { SmartProvider, SmartTextbox, SmartSuggestion } from '@extedcoud/smart-components';
import { createProxyClient } from '@extedcoud/smart-components/adapters/proxy';
import '@extedcoud/smart-components/style.css';

// Recommended for production: your backend owns the key.
const client = createProxyClient({ url: '/api/smart' });

export function App() {
  const [v, setV] = useState('');
  return (
    <SmartProvider client={client} model="gpt-4o-mini">
      <SmartTextbox value={v} onChange={setV} context="user is writing a support reply" />
      <SmartSuggestion
        value={v}
        onChange={setV}
        onSelect={(s) => console.log('picked', s)}
        context="naming a new project"
      />
    </SmartProvider>
  );
}
```

### Components

- **`<SmartTextbox>`** — input with Copilot-style ghost-text completion. ArrowRight accepts (configurable), Esc dismisses.
- **`<SmartTextarea>`** — multiline ghost completion (mirror-div positioning, multiline stops, optional auto-resize).
- **`<SmartSuggestion>`** — combobox with AI-generated dropdown suggestions. Arrow keys + Enter.
- **`<SmartRewrite>`** — headless rewrite primitive (render-prop only). Built-in presets: Shorter / Formal / Casual / Fix grammar.

All headless: minimal default DOM, `renderItem`/`renderGhost`/render-prop slots, every native input attribute passes through.

### Styling the ghost text

By default the ghost is `opacity: 0.4` inheriting the input's `color`. To recolor it, pass `ghostClassName` or `ghostStyle` — no `renderGhost` needed:

```tsx
<SmartTextbox
  value={v}
  onChange={setV}
  ghostStyle={{ color: '#0066cc', fontStyle: 'italic', opacity: 0.7 }}
/>
```

For richer ghost markup (icons, badges, etc.) use the `renderGhost` render-prop. For global styling outside the component, target `[data-testid="smart-textbox-ghost"]` / `[data-testid="smart-textarea-ghost"]`.

## Mobile support

Every component is built to work on touch as well as desktop. Specifics:

- **Accept key is configurable.** Defaults to `ArrowRight` (which doesn't exist on most soft keyboards). On mobile, expose an imperative accept via the field's ref, or remap `acceptKey` to something your touch UI surfaces.
- **All wrappers use `touch-action: manipulation`** to skip the 300ms tap delay on older mobile browsers.
- **`SmartSuggestion`** uses pointer events (mouse + touch + pen) for selection. Recommended: render items with `min-height: 44px` to meet WCAG touch-target minimum.
- **`SmartRewrite`** is headless — mobile UX is entirely your call. Preset buttons should be ≥44px tall.
- **iOS Safari zoom-on-focus**: any input with `font-size < 16px` triggers viewport zoom. Use `font-size: 16px` (or larger) on `SmartTextbox` / `SmartTextarea` in your styles.
- **Soft-keyboard overlap of `SmartSuggestion`'s dropdown** is a known limitation. For narrow viewports, hoist the list via a portal or render a fullscreen picker.

When adding new components: mobile + desktop are equal first-class targets. Test on a touch device (or the browser's device emulator at minimum) before shipping.

### AI clients

`SmartClient` is a capability-based interface. Pick an adapter or roll your own:

| Adapter | Import | Use case |
| --- | --- | --- |
| `createProxyClient` | `/adapters/proxy` | **Recommended for prod.** POSTs to your backend; your server holds the key. |
| `createOpenAIClient` | `/adapters/openai` | Direct OpenAI calls. Dev/demo only — never ship keys to the browser. |
| `createMockClient` | `/adapters/mock` | Tests & Storybook. |
| `createAnthropicClient` | `/adapters/anthropic` | Anthropic Messages API. Implements `complete` + `stream`. |

Roll your own by implementing the `SmartClient` interface:

```ts
import { SMART_CLIENT_PROTOCOL_VERSION, type SmartClient } from '@extedcoud/smart-components';

const myClient: SmartClient = {
  protocolVersion: SMART_CLIENT_PROTOCOL_VERSION,
  id: 'my-backend',
  capabilities: new Set(['complete', 'stream']),
  async complete(req) { /* ... */ return text; },
  async *stream(req) { /* yield chunks */ },
};
```

### Power-user hooks

```ts
import {
  useGhostCompletion,
  useSuggestionList,
  useRewrite,
  useSmartState,
} from '@extedcoud/smart-components';
```

Build your own components on the same protocol.

## `useSmartState` — useState with AI fill

Drop-in `useState` replacement that adds an `ai.generate(context?)` action. TS infers `T` from `initial`; the runtime shape is read from `initial`'s value, so JS callers get the same behavior without annotations.

```tsx
const [n, setN, ai] = useSmartState(0, 'a random integer between 1 and 100');
// setN still works exactly like useState.
<button onClick={() => ai.generate()} disabled={ai.status === 'loading'}>
  {ai.status === 'loading' ? 'Generating…' : 'Generate'}
</button>
```

### Examples

**1. Drop-in replacement.** `setValue` keeps full `useState` semantics:

```tsx
const [count, setCount] = useSmartState(0);
setCount(5);              // works
setCount(c => c + 1);     // works
```

**2. Generate an object.** Shape inferred from the initial value:

```tsx
type User = { name: string; age: number; bio: string };
const [user, setUser, ai] = useSmartState<User>(
  { name: '', age: 0, bio: '' },
  'a fictitious cyberpunk character',
);
<button onClick={() => ai.generate()}>Roll a new user</button>;
```

**3. Empty seed with explicit `shape`.** When initial is `null`, `undefined`, or `[]`, introspection has nothing to read — pass `options.shape`:

```tsx
const [tags, , ai] = useSmartState<string[]>([], 'tags for a sci-fi blog post', {
  shape: { type: 'array', item: 'string' },
});
```

**4. Per-call context override.** The default context can be overridden per call:

```tsx
const [user, , ai] = useSmartState({ name: '', age: 0 }, 'a hero');
ai.generate('a villain'); // overrides 'a hero' for this call
```

**5. Disable cache + handle errors.**

```tsx
const [v, , ai] = useSmartState(0, 'random', { cache: false });
{ai.status === 'error' && <p style={{ color: 'red' }}>{ai.error?.message}</p>}
```

**6. JS works identically.** No generics needed — the shape comes from `initial` at runtime:

```js
const [user, setUser, ai] = useSmartState(
  { name: '', age: 0 },
  'a fictitious cyberpunk character',
);
```

### Notes & gotchas

- Calling `setValue` while a generate is in flight **cancels** the in-flight call (user intent beats AI).
- `useSmartState({ tags: [] })` will throw at mount — the inner empty array can't be introspected. Seed it (`tags: ['example']`) or pass `options.shape`.
- `Date`, `Map`, `Set`, `RegExp`, functions, `bigint`, `symbol` in `initial` throw at mount — JSON-serializable types only.
- LRU(16) cache keyed by `(shape, context)`. Repeated `generate('same context')` hits the cache. Opt out with `{ cache: false }`.
- Requires the SmartClient to support `'complete'`. No streaming — generate is atomic; `setValue` fires once on success.

## Develop

This is a pnpm workspace: root = lib, `docs/` = the public docs site (Next.js + Fumadocs, deployed to GH Pages).

```sh
pnpm install
pnpm storybook                        # :6006 — internal dev surface
pnpm test                             # vitest watch
pnpm lint
pnpm typecheck
pnpm build                            # builds lib → dist/

# Docs site (depends on dist/ — build lib first)
pnpm --filter @extedcoud/smart-components build
pnpm --filter docs dev                # :3000
pnpm --filter docs build              # static export → docs/out/
```

Docs deploy automatically to GH Pages via `.github/workflows/deploy-docs.yml` on push to `main`.

## Stack

**Lib:** Vite (lib mode) · TypeScript · CSS Modules · ESLint 9 (flat) · Prettier · Vitest + RTL · Storybook.
**Docs:** Next.js 15 (static export) · Fumadocs UI · Tailwind v4 · MDX.
