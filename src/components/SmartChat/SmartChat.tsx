import { forwardRef, useImperativeHandle, type ReactNode } from 'react';
import { useChat, type UseChatOptions, type UseChatResult } from '../../hooks/useChat';

export interface SmartChatHandle {
  send: UseChatResult['send'];
  regenerate: UseChatResult['regenerate'];
  stop: UseChatResult['stop'];
  reset: UseChatResult['reset'];
  submitToolResult: UseChatResult['submitToolResult'];
}

export interface SmartChatProps extends UseChatOptions {
  /** Render-prop. The component renders no DOM of its own. */
  children: (state: UseChatResult) => ReactNode;
}

/**
 * Headless multi-turn chat. Calls `useChat` under the hood and hands the full
 * state to a render-prop. Forwards a ref exposing the imperative API for
 * power users (e.g. trigger send from outside the render tree).
 *
 * @example
 * <SmartChat system="You are helpful">
 *   {({ messages, send, status }) => (
 *     <>
 *       {messages.map(m => <Bubble key={m.id} m={m} />)}
 *       <SmartChatComposer onSend={send} disabled={status === 'streaming'} />
 *     </>
 *   )}
 * </SmartChat>
 */
export const SmartChat = forwardRef<SmartChatHandle, SmartChatProps>(function SmartChat(
  { children, ...opts },
  ref,
) {
  const state = useChat(opts);

  useImperativeHandle(
    ref,
    () => ({
      send: state.send,
      regenerate: state.regenerate,
      stop: state.stop,
      reset: state.reset,
      submitToolResult: state.submitToolResult,
    }),
    [state],
  );

  return <>{children(state)}</>;
});
