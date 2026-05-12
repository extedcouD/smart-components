import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { useTextFieldGate } from '../internal/useTextFieldGate';
import { GhostOverlay } from '../internal/GhostOverlay';
import styles from './SmartTextbox.module.css';

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'defaultValue'
>;

export interface SmartTextboxHandle {
  /** Commit the current ghost (if any). Returns true if accepted. */
  accept: () => boolean;
  /** Discard the current ghost. */
  dismiss: () => void;
  /** Focus the underlying input. */
  focus: () => void;
  /** Blur the underlying input. */
  blur: () => void;
  /** The current ghost text, or '' if no ghost is visible. Useful for
   *  rendering a tap-to-accept button on touch UIs. */
  getSuggestion: () => string;
}

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
  /** Key that accepts the ghost suggestion. Default: 'ArrowRight'.
   *  Accept fires only when the caret is at the end of the value, so the key
   *  retains its normal cursor-movement behavior elsewhere.
   *  Note: ArrowRight doesn't exist on most soft keyboards — for mobile, use
   *  the imperative `accept()` via ref, or set `acceptKey="Enter"`. */
  acceptKey?: string;
  /** Key that dismisses the ghost suggestion. Default: 'Escape'. */
  dismissKey?: string;
  /** Max tokens for the completion call. Default: 32. */
  maxTokens?: number;
  /** Render-prop override for the ghost text. */
  renderGhost?: (suggestion: string) => ReactNode;
  /** Class name applied to the outer wrapper. */
  wrapperClassName?: string;
  /** Called when the suggestion is accepted. */
  onAccept?: (accepted: string, finalValue: string) => void;
  /** Called whenever the visible ghost changes ('' when no ghost). Use this
   *  to render a tap-to-accept button on mobile. */
  onGhostChange?: (suggestion: string) => void;
}

export const SmartTextbox = forwardRef<SmartTextboxHandle, SmartTextboxProps>(function SmartTextbox(
  {
    value,
    onChange,
    context,
    minChars = 3,
    debounceMs = 300,
    stream = false,
    disableAI = false,
    acceptKey = 'ArrowRight',
    dismissKey = 'Escape',
    maxTokens = 32,
    renderGhost,
    wrapperClassName,
    onAccept,
    onGhostChange,
    className,
    onKeyDown,
    onFocus,
    onBlur,
    onSelect,
    onChange: _legacyOnChange,
    ...rest
  },
  forwardedRef,
) {
  const gate = useTextFieldGate<HTMLInputElement>({
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
    enabled: !disableAI,
  });

  // Stable ref to the latest callback so we don't re-fire on every render
  // when the consumer passes an inline function.
  const onGhostChangeRef = useRef(onGhostChange);
  onGhostChangeRef.current = onGhostChange;
  useEffect(() => {
    onGhostChangeRef.current?.(gate.ghostVisible ? gate.suggestion : '');
  }, [gate.ghostVisible, gate.suggestion]);

  useImperativeHandle(
    forwardedRef,
    () => ({
      accept: gate.accept,
      dismiss: gate.dismiss,
      focus: () => gate.ref.current?.focus(),
      blur: () => gate.ref.current?.blur(),
      getSuggestion: () => (gate.ghostVisible ? gate.suggestion : ''),
    }),
    [gate],
  );

  return (
    <span className={[styles.root, wrapperClassName].filter(Boolean).join(' ')}>
      <input
        ref={gate.ref}
        className={[styles.input, className].filter(Boolean).join(' ')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={gate.buildKeyDown(onKeyDown)}
        onFocus={gate.buildFocus(onFocus)}
        onBlur={gate.buildBlur(onBlur)}
        onSelect={gate.buildSelect(onSelect)}
        aria-autocomplete="inline"
        aria-haspopup="false"
        {...rest}
      />
      {/* Rendered AFTER the input so the mirror sits on top in stacking order;
          taps on the visible ghost reach it instead of the input below.
          The mirror is pointer-events: none everywhere except the ghost span,
          so taps elsewhere fall through to the input as normal. */}
      <GhostOverlay
        targetRef={gate.ref}
        value={value}
        suggestion={gate.suggestion}
        visible={gate.ghostVisible}
        onAccept={gate.accept}
        renderGhost={renderGhost}
        testId="smart-textbox-ghost"
      />
    </span>
  );
});
