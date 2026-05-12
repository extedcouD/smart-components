import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
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

export interface SmartTextareaHandle {
  /** Commit the current ghost (if any). Returns true if accepted. */
  accept: () => boolean;
  /** Discard the current ghost. */
  dismiss: () => void;
  /** Focus the underlying textarea. */
  focus: () => void;
  /** Blur the underlying textarea. */
  blur: () => void;
  /** The current ghost text, or '' if no ghost is visible. */
  getSuggestion: () => string;
}

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
   *  retains its normal cursor-movement behavior elsewhere.
   *  Note: ArrowRight doesn't exist on most soft keyboards — for mobile, use
   *  the imperative `accept()` via ref. Do NOT use 'Enter' here; it'd hijack
   *  the newline key. */
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
  /** Called whenever the visible ghost changes ('' when no ghost). Use this
   *  to render a tap-to-accept button on mobile. */
  onGhostChange?: (suggestion: string) => void;
}

const DEFAULT_STOP = ['\n\n'];

export const SmartTextarea = forwardRef<SmartTextareaHandle, SmartTextareaProps>(
  function SmartTextarea(
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
      maxTokens = 64,
      stop,
      autoResize = false,
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
    const effectiveStop = useMemo(() => stop ?? DEFAULT_STOP, [stop]);

    const gate = useTextFieldGate<HTMLTextAreaElement>({
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
      const el = gate.ref.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }, [gate.ref, autoResize, value, gate.suggestion, gate.ghostVisible]);

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
        <textarea
          ref={gate.ref}
          className={[styles.textarea, className].filter(Boolean).join(' ')}
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
        {/* Rendered AFTER the textarea so the mirror sits on top in stacking
            order; taps on the visible ghost reach it instead of the textarea.
            The mirror is pointer-events: none everywhere except the ghost span,
            so taps elsewhere fall through to the textarea as normal. */}
        <GhostOverlay
          targetRef={gate.ref}
          value={value}
          suggestion={gate.suggestion}
          visible={gate.ghostVisible}
          onAccept={gate.accept}
          renderGhost={renderGhost}
          testId="smart-textarea-ghost"
        />
      </span>
    );
  },
);
