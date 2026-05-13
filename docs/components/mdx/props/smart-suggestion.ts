import type { PropRow } from '../props-table';

export const SMART_SUGGESTION_PROPS: PropRow[] = [
  { name: 'value', type: 'string', required: true, description: 'Controlled input value.' },
  { name: 'onChange', type: '(value: string) => void', required: true, description: 'Called on user input.' },
  { name: 'onSelect', type: '(item: string) => void', description: 'Called when the user selects a suggestion (Enter, click, or keyboard).' },
  { name: 'context', type: 'string', description: 'Optional context string included in the prompt.' },
  { name: 'count', type: 'number', default: '5', description: 'Max suggestions requested.' },
  { name: 'debounceMs', type: 'number', default: '300', description: 'Debounce window in ms.' },
  { name: 'minChars', type: 'number', default: '1', description: 'Minimum chars before suggestions fetch.' },
  { name: 'disableAI', type: 'boolean', default: 'false', description: 'Disable AI calls.' },
  { name: 'renderItem', type: '(item, { active, index }) => ReactNode', description: 'Render override for each item.' },
  { name: 'renderEmpty', type: '() => ReactNode', description: 'Render override when results are empty.' },
  { name: 'renderLoading', type: '() => ReactNode', description: 'Render override while loading.' },
  { name: 'wrapperClassName', type: 'string', description: 'Class name on the outer wrapper.' },
  { name: 'listClassName', type: 'string', description: 'Class name on the listbox.' },
  { name: 'itemClassName', type: 'string', description: 'Class name on each item.' },
  { name: '...rest', type: 'InputHTMLAttributes<HTMLInputElement>', description: 'All native input props (combobox aria-* and onSelect are managed internally).' },
];
