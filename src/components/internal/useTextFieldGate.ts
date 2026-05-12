import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
  type SyntheticEvent,
} from 'react';
import { useGhostCompletion, type UseGhostCompletionOptions } from '../../hooks/useGhostCompletion';

type AnyTextEl = HTMLInputElement | HTMLTextAreaElement;

export interface UseTextFieldGateOptions extends Omit<UseGhostCompletionOptions, 'enabled'> {
  /** Externally-controlled enable flag (e.g. !disableAI). Default: true. */
  enabled?: boolean;
  /** Current value of the controlled field. */
  value: string;
  /** Setter for the controlled value. */
  onChange: (v: string) => void;
  /** Called after the user accepts the ghost. */
  onAccept?: (accepted: string, finalValue: string) => void;
  /** Key that accepts the ghost. */
  acceptKey: string;
  /** Key that dismisses the ghost. */
  dismissKey: string;
}

export interface UseTextFieldGateResult<T extends AnyTextEl> {
  ref: RefObject<T | null>;
  /** Current ghost text from the hook. */
  suggestion: string;
  /** Whether the ghost should be rendered. */
  ghostVisible: boolean;
  /** Imperative accept — commits the current ghost and resets state.
   *  Returns true if there was a ghost to accept, false otherwise.
   *  Use this from a touch UI button when keyboard accept isn't available. */
  accept: () => boolean;
  /** Imperative dismiss — clears the current ghost. */
  dismiss: () => void;
  /** Build a keydown handler that consumes accept/dismiss keys before
   *  delegating to the consumer's onKeyDown. */
  buildKeyDown: (consumer?: (e: KeyboardEvent<T>) => void) => (e: KeyboardEvent<T>) => void;
  /** Build a focus handler that updates internal focus + caret state. */
  buildFocus: (consumer?: (e: FocusEvent<T>) => void) => (e: FocusEvent<T>) => void;
  /** Build a blur handler. */
  buildBlur: (consumer?: (e: FocusEvent<T>) => void) => (e: FocusEvent<T>) => void;
  /** Build a select handler that updates caret-at-end. */
  buildSelect: (consumer?: (e: SyntheticEvent<T>) => void) => (e: SyntheticEvent<T>) => void;
}

/**
 * Shared focus + caret-at-end + key-handling gate for SmartTextbox and SmartTextarea.
 *
 * Encapsulates:
 *  - `isFocused` state and the rule that AI must only run when focused.
 *  - `caretAtEnd` state and the rule that ghost is shown only when caret is at end.
 *  - Accept-key (default ArrowRight) and dismiss-key (default Escape) handling.
 *  - Streaming-aware ghost-visibility computation.
 *
 * Returns "handler builders" that wrap consumer-provided callbacks so the component
 * can preserve normal React event semantics (consumer's handler runs only if we
 * didn't consume the event).
 */
export function useTextFieldGate<T extends AnyTextEl>(
  opts: UseTextFieldGateOptions,
): UseTextFieldGateResult<T> {
  const {
    value,
    onChange,
    onAccept,
    acceptKey,
    dismissKey,
    enabled = true,
    stream = false,
    ...completionRest
  } = opts;

  const ref = useRef<T | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  // visualFocused mirrors isFocused but its `false` transition is delayed
  // ~250ms. This keeps the ghost in the DOM (and tappable) long enough for
  // a pending tap-on-ghost `click` to fire, even on browsers (Samsung
  // Internet) that fire `blur` between `pointerdown` and `click` despite
  // our preventDefault on pointerdown.
  const [visualFocused, setVisualFocused] = useState(false);
  const visualBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [caretAtEnd, setCaretAtEnd] = useState(true);

  useEffect(() => {
    return () => {
      if (visualBlurTimerRef.current) clearTimeout(visualBlurTimerRef.current);
    };
  }, []);

  const { suggestion, status, dismiss } = useGhostCompletion({
    ...completionRest,
    value,
    stream,
    enabled: enabled && isFocused && caretAtEnd,
  });

  const ghostVisible =
    visualFocused &&
    caretAtEnd &&
    (status === 'ready' || (stream && status === 'loading')) &&
    suggestion.length > 0;

  const updateCaretAtEnd = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    // selectionStart is null for input types that don't support text selection
    // (e.g. type="number"); treat that as "always at end" since the concept doesn't apply.
    if (start == null || end == null) {
      setCaretAtEnd(true);
      return;
    }
    setCaretAtEnd(start === value.length && end === value.length);
  }, [value.length]);

  // Re-evaluate caret position whenever the value changes (covers controlled re-renders).
  useEffect(() => {
    updateCaretAtEnd();
  }, [updateCaretAtEnd, value]);

  const accept = useCallback((): boolean => {
    // Intentionally NOT gated on ghostVisible — only on whether there's a
    // suggestion in state. This makes tap-on-ghost robust against browsers
    // (e.g. Samsung Internet) that steal focus on pointerdown despite
    // preventDefault, which would otherwise flip ghostVisible to false
    // before the click handler runs.
    if (!suggestion) return false;
    const finalValue = value + suggestion;
    onChange(finalValue);
    onAccept?.(suggestion, finalValue);
    dismiss();
    return true;
  }, [suggestion, value, onChange, onAccept, dismiss]);

  const buildKeyDown = useCallback(
    (consumer?: (e: KeyboardEvent<T>) => void) => (e: KeyboardEvent<T>) => {
      if (ghostVisible && e.key === acceptKey) {
        e.preventDefault();
        accept();
        return;
      }
      if (ghostVisible && e.key === dismissKey) {
        e.preventDefault();
        dismiss();
        return;
      }
      consumer?.(e);
    },
    [ghostVisible, acceptKey, dismissKey, accept, dismiss],
  );

  const buildFocus = useCallback(
    (consumer?: (e: FocusEvent<T>) => void) => (e: FocusEvent<T>) => {
      if (visualBlurTimerRef.current) {
        clearTimeout(visualBlurTimerRef.current);
        visualBlurTimerRef.current = null;
      }
      setIsFocused(true);
      setVisualFocused(true);
      updateCaretAtEnd();
      consumer?.(e);
    },
    [updateCaretAtEnd],
  );

  const buildBlur = useCallback(
    (consumer?: (e: FocusEvent<T>) => void) => (e: FocusEvent<T>) => {
      // Stop new fetches immediately…
      setIsFocused(false);
      // …but keep the ghost in the DOM briefly so a Samsung-Internet-style
      // blur-then-click sequence still lands the click on the ghost span.
      if (visualBlurTimerRef.current) clearTimeout(visualBlurTimerRef.current);
      visualBlurTimerRef.current = setTimeout(() => {
        setVisualFocused(false);
        visualBlurTimerRef.current = null;
      }, 250);
      consumer?.(e);
    },
    [],
  );

  const buildSelect = useCallback(
    (consumer?: (e: SyntheticEvent<T>) => void) => (e: SyntheticEvent<T>) => {
      updateCaretAtEnd();
      consumer?.(e);
    },
    [updateCaretAtEnd],
  );

  return {
    ref,
    suggestion,
    ghostVisible,
    accept,
    dismiss,
    buildKeyDown,
    buildFocus,
    buildBlur,
    buildSelect,
  };
}
