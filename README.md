# react-ai-components

React UI component library.

## Install

```sh
pnpm add react-ai-components
# peer deps:
pnpm add react react-dom
```

## Usage

```tsx
import { Button } from 'react-ai-components';
import 'react-ai-components/style.css';

export function App() {
  return <Button variant="primary">Hello</Button>;
}
```

## Develop

```sh
pnpm install
pnpm storybook   # component playground @ :6006
pnpm test        # vitest watch
pnpm lint
pnpm build       # → dist/
```

## Stack

Vite (lib mode) · TypeScript · CSS Modules · ESLint 9 (flat) · Prettier · Vitest + RTL · Storybook 8.
