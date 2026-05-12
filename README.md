# @extedcoud/smart-components

Headless React UI components powered by an LLM. Painfully small DOM, painfully customizable. You provide the AI client, we provide the behavior.

## Install

```sh
pnpm add @extedcoud/smart-components
pnpm add react react-dom
# only if you use the OpenAI adapter:
pnpm add openai
```

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

- **`<SmartTextbox>`** — input with Copilot-style ghost-text completion. Tab accepts, Esc dismisses.
- **`<SmartSuggestion>`** — combobox with AI-generated dropdown suggestions. Arrow keys + Enter.

Both are headless: minimal default DOM, `renderItem`/`renderGhost` render-prop slots, every native input attribute passes through.

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
