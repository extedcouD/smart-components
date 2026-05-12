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
- **`<SmartChat>` + `<SmartChatComposer>`** — multi-turn conversational primitive. Provider-agnostic chat protocol, streamed text-deltas, end-to-end tool calling (incl. auto-execute), multimodal (image content blocks), controlled or uncontrolled message state.

All headless: minimal default DOM, `renderItem`/`renderGhost`/render-prop slots, every native input attribute passes through.

### 10-line chat

```tsx
import { SmartProvider, SmartChat, SmartChatComposer } from '@extedcoud/smart-components';
import { createOpenAIClient } from '@extedcoud/smart-components/adapters/openai';

const client = createOpenAIClient({ apiKey: '…' });

export function App() {
  return (
    <SmartProvider client={client}>
      <SmartChat system="You are a helpful assistant.">
        {({ messages, send, status }) => (
          <>
            {messages.map((m) => (
              <div key={m.id}>
                <b>{m.role}: </b>
                {m.content.map((b, i) => (b.type === 'text' ? <span key={i}>{b.text}</span> : null))}
              </div>
            ))}
            <SmartChatComposer onSend={send} disabled={status === 'streaming'} />
          </>
        )}
      </SmartChat>
    </SmartProvider>
  );
}
```

Add a tool with zero extra boilerplate — when an `execute` function is provided, the hook runs it automatically and feeds the result back:

```tsx
<SmartChat
  tools={[{
    name: 'get_weather',
    description: 'Get current weather for a city.',
    parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
    execute: async ({ city }) => (await fetch(`/api/weather?city=${city}`)).json(),
  }]}
>{/* … */}</SmartChat>
```

Multimodal: pass content blocks to `send()` directly — `send([{type:'image', source:{kind:'base64', data, mediaType}}, {type:'text', text:'what is this?'}])`.

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
| `createAnthropicClient` | `/adapters/anthropic` | Anthropic Messages API. Implements `chat` + `chatStream` (incl. tools + image content). |

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
import { useGhostCompletion, useSuggestionList, useRewrite, useChat } from '@extedcoud/smart-components';
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
