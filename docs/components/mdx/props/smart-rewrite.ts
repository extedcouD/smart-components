import type { PropRow } from '../props-table';

export const SMART_REWRITE_PROPS: PropRow[] = [
  { name: 'value', type: 'string', required: true, description: 'Current text.' },
  { name: 'onChange', type: '(value: string) => void', required: true, description: 'Called when the user accepts the rewrite.' },
  { name: 'instruction', type: 'string', description: 'Default instruction; overridable per run() call.' },
  { name: 'context', type: 'string', description: 'Optional context string included in the prompt.' },
  { name: 'presets', type: 'ReadonlyArray<SmartRewritePreset>', default: 'DEFAULT_REWRITE_PRESETS', description: 'Presets exposed to the render-prop. Default: Shorter / Formal / Casual / Fix grammar.' },
  { name: 'stream', type: 'boolean', default: 'false', description: 'Stream chunks as they arrive.' },
  { name: 'maxTokens', type: 'number', default: '512', description: 'Max tokens for the rewrite call.' },
  { name: 'temperature', type: 'number', default: '0.4', description: 'Sampling temperature.' },
  { name: 'children', type: '(args: SmartRewriteRenderArgs) => ReactNode', required: true, description: 'Render-prop. The component renders no DOM of its own. Receives { value, presets, rewrite, status, error, run, accept, reject }.' },
];
