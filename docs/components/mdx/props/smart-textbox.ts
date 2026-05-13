import type { PropRow } from '../props-table';

export const SMART_TEXTBOX_PROPS: PropRow[] = [
  { name: 'value', type: 'string', required: true, description: 'Controlled input value.' },
  { name: 'onChange', type: '(value: string) => void', required: true, description: 'Called on user input or accept.' },
  { name: 'context', type: 'string', description: 'Optional context string included in the prompt to bias completion.' },
  { name: 'minChars', type: 'number', default: '3', description: 'Minimum chars before suggestions fetch.' },
  { name: 'debounceMs', type: 'number', default: '300', description: 'Debounce window in ms.' },
  { name: 'stream', type: 'boolean', default: 'false', description: 'Use the streaming capability for faster first paint.' },
  { name: 'disableAI', type: 'boolean', default: 'false', description: 'Disable all AI calls.' },
  { name: 'acceptKey', type: 'string', default: "'ArrowRight'", description: 'Key that accepts the ghost. Fires only when caret is at end of value. Note: ArrowRight does not exist on most soft keyboards — for mobile use the imperative accept() via ref, or set acceptKey="Enter".' },
  { name: 'dismissKey', type: 'string', default: "'Escape'", description: 'Key that dismisses the ghost.' },
  { name: 'maxTokens', type: 'number', default: '32', description: 'Max tokens for the completion call.' },
  { name: 'renderGhost', type: '(suggestion: string) => ReactNode', description: 'Render-prop override for the ghost text.' },
  { name: 'ghostClassName', type: 'string', description: 'Class name applied to the ghost text span.' },
  { name: 'ghostStyle', type: 'CSSProperties', description: 'Inline style applied to the ghost text span. Defaults to opacity: 0.4 inheriting input color.' },
  { name: 'wrapperClassName', type: 'string', description: 'Class name applied to the outer wrapper.' },
  { name: 'onAccept', type: '(accepted, finalValue) => void', description: 'Called when the suggestion is accepted.' },
  { name: 'onGhostChange', type: '(suggestion: string) => void', description: "Called whenever the visible ghost changes ('' when no ghost). Use to render a tap-to-accept button on mobile." },
  { name: '...rest', type: 'InputHTMLAttributes<HTMLInputElement>', description: 'All native input props minus value, onChange, defaultValue.' },
];

export const SMART_TEXTBOX_HANDLE: PropRow[] = [
  { name: 'accept', type: '() => boolean', description: 'Commit the current ghost. Returns true if accepted.' },
  { name: 'dismiss', type: '() => void', description: 'Discard the current ghost.' },
  { name: 'focus', type: '() => void', description: 'Focus the underlying input.' },
  { name: 'blur', type: '() => void', description: 'Blur the underlying input.' },
  { name: 'getSuggestion', type: '() => string', description: "Current ghost text or ''. Useful for rendering a tap-to-accept button." },
];
