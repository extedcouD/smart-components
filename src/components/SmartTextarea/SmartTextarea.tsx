import {
  useLayoutEffect,
  useMemo,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { useTextFieldGate } from '../internal/useTextFieldGate';
import { GhostOverlay } from '../internal/GhostOverlay';
import styles from './SmartTextarea.module.css';

type NativeTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange' | 'defaultValue'
>;

export interface SmartTextareaProps extends NativeTextareaProps {
  /** Current textarea value (controlled). */
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
  /** Key that accepts the ghost suggestion. Default: 'ArrowRight'.
   *  Accept fires only when the caret is at the end of the value, so the key
   *  retains its normal cursor-movement behavior elsewhere. */
  acceptKey?: string;
  /** Key that dismisses the ghost suggestion. Default: 'Escape'. */
  dismissKey?: string;
  /** Max tokens for the completion call. Default: 64. */
  maxTokens?: number;
  /** Stop sequences for the completion. Default: ['\n\n']. */
  stop?: string[];
  /** Auto-grow the textarea to fit content. Default: false. */
  autoResize?: boolean;
  /** Render-prop override for the ghost text. */
  renderGhost?: (suggestion: string) => ReactNode;
  /** Class name applied to the outer wrapper. */
  wrapperClassName?: string;
  /** Called when the suggestion is accepted. */
  onAccept?: (accepted: string, finalValue: string) => void;
}

const DEFAULT_STOP = ['\n\n'];

export function SmartTextarea({
  value,
  onChange,
  context,
  minChars = 3,
  debounceMs = 300,
  stream = false,
  disableAI = false,
  acceptKey = 'ArrowRight',
  dismissKey = 'Escape',
  maxTokens = 64,
  stop,
  autoResize = false,
  renderGhost,
  wrapperClassName,
  onAccept,
  className,
  onKeyDown,
  onFocus,
  onBlur,
  onSelect,
  onChange: _legacyOnChange,
  ...rest
}: SmartTextareaProps) {
  const effectiveStop = useMemo(() => stop ?? DEFAULT_STOP, [stop]);

  const { ref, suggestion, ghostVisible, buildKeyDown, buildFocus, buildBlur, buildSelect } =
    useTextFieldGate<HTMLTextAreaElement>({
      value,
      onChange,
      onAccept,
      acceptKey,
      dismissKey,
      context,
      minChars,
      debounceMs,
      stream,
      maxTokens,
      stop: effectiveStop,
      multiline: true,
      enabled: !disableAI,
    });

  // Auto-resize: grow textarea to fit content.
  useLayoutEffect(() => {
    if (!autoResize) return;
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [ref, autoResize, value, suggestion, ghostVisible]);

  return (
    <span className={[styles.root, wrapperClassName].filter(Boolean).join(' ')}>
      <GhostOverlay
        targetRef={ref}
        value={value}
        suggestion={suggestion}
        visible={ghostVisible}
        renderGhost={renderGhost}
        testId="smart-textarea-ghost"
      />
      <textarea
        ref={ref}
        className={[styles.textarea, className].filter(Boolean).join(' ')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={buildKeyDown(onKeyDown)}
        onFocus={buildFocus(onFocus)}
        onBlur={buildBlur(onBlur)}
        onSelect={buildSelect(onSelect)}
        aria-autocomplete="inline"
        aria-haspopup="false"
        {...rest}
      />
    </span>
  );
}
