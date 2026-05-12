import {
  useCallback,
  useRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useGhostCompletion } from '../../hooks/useGhostCompletion';
import styles from './SmartTextbox.module.css';

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'defaultValue'
>;

export interface SmartTextboxProps extends NativeInputProps {
  /** Current input value (controlled). */
  value: string;
  /** Called with the new value on user input or accept. */
  onChange: (value: string) => void;
  /** Optional context string included in the prompt to bias the completion. */
  context?: string;
  /** Minimum chars before suggestions are fetched. Default: 3. */
  minChars?: number;
  /** Debounce window in ms. Default: 300. */
  debounceMs?: number;
  /** Use the streaming capability for faster first paint. Default: false. */
  stream?: boolean;
  /** Disable all AI calls. Default: false. */
  disableAI?: boolean;
  /** Key that accepts the ghost suggestion. Default: 'Tab'. */
  acceptKey?: string;
  /** Key that dismisses the ghost suggestion. Default: 'Escape'. */
  dismissKey?: string;
  /** Max tokens for the completion call. Default: 32. */
  maxTokens?: number;
  /** Render-prop override for the ghost text. Receives the suggestion string. */
  renderGhost?: (suggestion: string) => ReactNode;
  /** Class name applied to the outer wrapper. */
  wrapperClassName?: string;
  /** Called when the suggestion is accepted. */
  onAccept?: (accepted: string, finalValue: string) => void;
}

export function SmartTextbox({
  value,
  onChange,
  context,
  minChars = 3,
  debounceMs = 300,
  stream = false,
  disableAI = false,
  acceptKey = 'Tab',
  dismissKey = 'Escape',
  maxTokens = 32,
  renderGhost,
  wrapperClassName,
  onAccept,
  className,
  onKeyDown,
  onChange: _legacyOnChange,
  ...rest
}: SmartTextboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { suggestion, status, dismiss } = useGhostCompletion({
    value,
    context,
    debounceMs,
    minChars,
    stream,
    maxTokens,
    enabled: !disableAI,
  });

  const ghostVisible = (status === 'ready' || (stream && status === 'loading')) && suggestion.length > 0;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (ghostVisible && e.key === acceptKey) {
        e.preventDefault();
        const finalValue = value + suggestion;
        onChange(finalValue);
        onAccept?.(suggestion, finalValue);
        dismiss();
        return;
      }
      if (ghostVisible && e.key === dismissKey) {
        e.preventDefault();
        dismiss();
        return;
      }
      onKeyDown?.(e);
    },
    [ghostVisible, acceptKey, dismissKey, value, suggestion, onChange, onAccept, dismiss, onKeyDown],
  );

  const wrapperClass = [styles.root, wrapperClassName].filter(Boolean).join(' ');
  const inputClass = [styles.input, className].filter(Boolean).join(' ');

  return (
    <span className={wrapperClass}>
      <input
        ref={inputRef}
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-autocomplete="inline"
        aria-haspopup="false"
        {...rest}
      />
      <span
        className={[styles.ghost, ghostVisible ? styles.ghostVisible : styles.ghostHidden]
          .filter(Boolean)
          .join(' ')}
        aria-hidden="true"
        data-testid="smart-textbox-ghost"
      >
        {ghostVisible ? (
          <>
            <span style={{ visibility: 'hidden' }}>{value}</span>
            {renderGhost ? renderGhost(suggestion) : suggestion}
          </>
        ) : null}
      </span>
    </span>
  );
}
