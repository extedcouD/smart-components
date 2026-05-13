import type { PropRow } from '../props-table';

export const SMART_TEXTAREA_PROPS: PropRow[] = [
  { name: 'value', type: 'string', required: true, description: 'Controlled textarea value.' },
  { name: 'onChange', type: '(value: string) => void', required: true, description: 'Called on user input or accept.' },
  { name: 'context', type: 'string', description: 'Optional context string included in the prompt.' },
  { name: 'minChars', type: 'number', default: '3', description: 'Minimum chars before suggestions fetch.' },
  { name: 'debounceMs', type: 'number', default: '300', description: 'Debounce window in ms.' },
  { name: 'stream', type: 'boolean', default: 'false', description: 'Use the streaming capability for faster first paint.' },
  { name: 'disableAI', type: 'boolean', default: 'false', description: 'Disable all AI calls.' },
  { name: 'acceptKey', type: 'string', default: "'ArrowRight'", description: 'Accept key. Do NOT use "Enter" — it would hijack newline.' },
  { name: 'dismissKey', type: 'string', default: "'Escape'", description: 'Key that dismisses the ghost.' },
  { name: 'maxTokens', type: 'number', default: '64', description: 'Max tokens for the completion call.' },
  { name: 'stop', type: 'string[]', default: "['\\n\\n']", description: 'Stop sequences for the completion.' },
  { name: 'autoResize', type: 'boolean', default: 'false', description: 'Auto-grow the textarea to fit content.' },
  { name: 'renderGhost', type: '(suggestion: string) => ReactNode', description: 'Render-prop override for the ghost text.' },
  { name: 'ghostClassName', type: 'string', description: 'Class name applied to the ghost text span.' },
  { name: 'ghostStyle', type: 'CSSProperties', description: 'Inline style applied to the ghost text span.' },
  { name: 'wrapperClassName', type: 'string', description: 'Class name applied to the outer wrapper.' },
  { name: 'onAccept', type: '(accepted, finalValue) => void', description: 'Called when the suggestion is accepted.' },
  { name: 'onGhostChange', type: '(suggestion: string) => void', description: 'Called whenever the visible ghost changes.' },
  { name: '...rest', type: 'TextareaHTMLAttributes<HTMLTextAreaElement>', description: 'All native textarea props minus value, onChange, defaultValue.' },
];
