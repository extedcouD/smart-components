import type { PropRow } from '../props-table';

export const SMART_PARAPHRASE_AREA_PROPS: PropRow[] = [
  { name: 'value', type: 'string', required: true, description: 'Controlled textarea value.' },
  { name: 'onChange', type: '(value: string) => void', required: true, description: 'Called on user input and when a rewrite is accepted.' },
  { name: 'context', type: 'string', description: 'Optional context string included in the prompt.' },
  { name: 'instruction', type: 'string', description: 'Default rewrite instruction.' },
  { name: 'stream', type: 'boolean', default: 'false', description: 'Use the streaming capability for faster first paint.' },
  { name: 'maxTokens', type: 'number', default: '512', description: 'Max tokens for the rewrite call.' },
  { name: 'temperature', type: 'number', default: '0.4', description: 'Sampling temperature.' },
  { name: 'disableAI', type: 'boolean', default: 'false', description: 'Hide the button and no-op imperative rewrite().' },
  { name: 'autoResize', type: 'boolean', default: 'false', description: 'Auto-grow the textarea to fit content.' },
  { name: 'icon', type: 'ReactNode', description: 'Custom icon for the button. Defaults to a built-in sparkle SVG.' },
  { name: 'buttonAriaLabel', type: 'string', default: "'Paraphrase'", description: 'Accessible label for the button.' },
  { name: 'buttonClassName', type: 'string', description: 'Class name applied to the button.' },
  { name: 'buttonStyle', type: 'CSSProperties', description: 'Inline style applied to the button.' },
  { name: 'renderButton', type: '(args: ParaphraseButtonRenderArgs) => ReactNode', description: 'Full custom render for the button.' },
  { name: 'wrapperClassName', type: 'string', description: 'Class name applied to the outer wrapper.' },
  { name: 'onRewriteStart', type: '() => void', description: 'Called when a rewrite starts.' },
  { name: 'onRewriteAccept', type: '(rewrite: string) => void', description: 'Called when a rewrite is accepted.' },
  { name: 'onRewriteError', type: '(error: Error) => void', description: 'Called when a rewrite errors.' },
  { name: '...rest', type: 'TextareaHTMLAttributes<HTMLTextAreaElement>', description: 'All native textarea props minus value, onChange, defaultValue.' },
];
