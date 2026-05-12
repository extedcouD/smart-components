# @extedcoud/smart-components

Headless React UI components powered by an LLM. Painfully small DOM, painfully customizable. You provide the AI client, we provide the behavior.

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
| `createAnthropicClient` | `/adapters/anthropic` | v0.2 (stub). |

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
import { useGhostCompletion, useSuggestionList } from '@extedcoud/smart-components';
```

Build your own components on the same protocol.

## Develop

```sh
pnpm install
pnpm storybook    # :6006
pnpm test         # vitest watch
pnpm lint
pnpm typecheck
pnpm build
```

## Stack

Vite (lib mode) · TypeScript · CSS Modules · ESLint 9 (flat) · Prettier · Vitest + RTL · Storybook.
