import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ForwardedRef,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { SmartRewrite, type SmartRewriteRenderArgs } from '../SmartRewrite/SmartRewrite';
import { ParaphraseButton, type ParaphraseButtonRenderArgs } from './ParaphraseButton';
import { useAutoAccept } from './useAutoAccept';
import styles from './SmartParaphrase.module.css';

type NativeTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange' | 'defaultValue'
>;

export interface SmartParaphraseAreaHandle {
  /** Imperatively trigger a rewrite (same as clicking the button). */
  rewrite: () => void;
  /** Abort an in-flight rewrite. */
  cancel: () => void;
  /** Focus the underlying textarea. */
  focus: () => void;
  /** Blur the underlying textarea. */
  blur: () => void;
}

export interface SmartParaphraseAreaProps extends NativeTextareaProps {
  /** Current textarea value (controlled). */
  value: string;
  /** Called on user input and when a rewrite is accepted. */
  onChange: (value: string) => void;
  /** Optional context string included in the prompt to bias the rewrite. */
  context?: string;
  /** Default rewrite instruction. */
  instruction?: string;
  /** Use the streaming capability for faster first paint. Default: false. */
  stream?: boolean;
  /** Max tokens for the rewrite call. Default: 512. */
  maxTokens?: number;
  /** Sampling temperature. Default: 0.4. */
  temperature?: number;
  /** Hide the button and no-op imperative rewrite(). Default: false. */
  disableAI?: boolean;
  /** Auto-grow the textarea to fit content. Default: false. */
  autoResize?: boolean;
  /** Custom icon for the button. Defaults to a built-in sparkle SVG. */
  icon?: ReactNode;
  /** Accessible label for the button. Default: 'Paraphrase'. */
  buttonAriaLabel?: string;
  /** Class name applied to the button. */
  buttonClassName?: string;
  /** Inline style applied to the button. */
  buttonStyle?: CSSProperties;
  /** Full custom render for the button. Receives onClick/status/disabled. */
  renderButton?: (args: ParaphraseButtonRenderArgs) => ReactNode;
  /** Class name applied to the outer wrapper. */
  wrapperClassName?: string;
  /** Called when a rewrite starts (status → loading). */
  onRewriteStart?: () => void;
  /** Called when a rewrite is accepted, with the rewritten text. */
  onRewriteAccept?: (rewrite: string) => void;
  /** Called when a rewrite errors. */
  onRewriteError?: (error: Error) => void;
}

interface InnerProps {
  state: SmartRewriteRenderArgs;
  forwardedRef: ForwardedRef<SmartParaphraseAreaHandle>;
  onUserChange: (value: string) => void;
  autoResize: boolean;
  textareaProps: NativeTextareaProps & {
    disableAI?: boolean;
    icon?: ReactNode;
    buttonAriaLabel?: string;
    buttonClassName?: string;
    buttonStyle?: CSSProperties;
    renderButton?: (args: ParaphraseButtonRenderArgs) => ReactNode;
    wrapperClassName?: string;
    onRewriteStart?: () => void;
    onRewriteAccept?: (rewrite: string) => void;
    onRewriteError?: (error: Error) => void;
  };
}

function Inner({ state, forwardedRef, onUserChange, autoResize, textareaProps }: InnerProps) {
  const {
    disableAI = false,
    icon,
    buttonAriaLabel = 'Paraphrase',
    buttonClassName,
    buttonStyle,
    renderButton,
    wrapperClassName,
    onRewriteStart,
    onRewriteAccept,
    onRewriteError,
    className,
    ...rest
  } = textareaProps;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useAutoAccept(state, { onRewriteStart, onRewriteAccept, onRewriteError });

  useLayoutEffect(() => {
    if (!autoResize) return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [autoResize, state.value, state.rewrite]);

  const triggerRewrite = useCallback(() => {
    if (disableAI || !state.value) return;
    state.run();
  }, [disableAI, state]);

  useImperativeHandle(
    forwardedRef,
    () => ({
      rewrite: triggerRewrite,
      cancel: state.reject,
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
    }),
    [triggerRewrite, state.reject],
  );

  const buttonDisabled = !state.value || state.status === 'loading';

  // While streaming/finalizing show the accumulating rewrite so users see
  // partial output ("faster first paint"); accept() routes it back through
  // onChange and rewrite resets to '' → textarea returns to state.value.
  const inFlight = state.status === 'loading' || state.status === 'ready';
  const displayValue = inFlight && state.rewrite ? state.rewrite : state.value;

  // Force paddingRight after the rest-spread so a consumer's `padding`
  // shorthand can't shrink the right reserve zone the button sits in.
  // Force paddingBottom for the same reason — button sits bottom-right.
  const userStyle = rest.style;
  const mergedStyle = {
    ...userStyle,
    paddingRight: userStyle?.paddingRight ?? 44,
    paddingBottom: userStyle?.paddingBottom ?? 40,
  };

  return (
    <span className={[styles.root, wrapperClassName].filter(Boolean).join(' ')}>
      <textarea
        ref={textareaRef}
        className={[styles.field, styles.fieldArea, className].filter(Boolean).join(' ')}
        value={displayValue}
        onChange={(e) => onUserChange(e.target.value)}
        readOnly={inFlight && !!state.rewrite}
        aria-busy={state.status === 'loading'}
        {...rest}
        style={mergedStyle}
      />
      {!disableAI && (
        <ParaphraseButton
          position="area"
          icon={icon}
          status={state.status}
          disabled={buttonDisabled}
          onClick={triggerRewrite}
          ariaLabel={buttonAriaLabel}
          className={buttonClassName}
          style={buttonStyle}
          renderButton={renderButton}
          testId="smart-paraphrase-area-button"
        />
      )}
    </span>
  );
}

export const SmartParaphraseArea = forwardRef<
  SmartParaphraseAreaHandle,
  SmartParaphraseAreaProps
>(function SmartParaphraseArea(props, forwardedRef) {
  const {
    value,
    onChange,
    context,
    instruction,
    stream = false,
    maxTokens = 512,
    temperature = 0.4,
    autoResize = false,
    ...rest
  } = props;

  return (
    <SmartRewrite
      value={value}
      onChange={onChange}
      context={context}
      instruction={instruction}
      stream={stream}
      maxTokens={maxTokens}
      temperature={temperature}
    >
      {(state) => (
        <Inner
          state={state}
          forwardedRef={forwardedRef}
          onUserChange={onChange}
          autoResize={autoResize}
          textareaProps={rest}
        />
      )}
    </SmartRewrite>
  );
});
