import { useEffect, useRef } from 'react';
import type { SmartRewriteRenderArgs } from '../SmartRewrite/SmartRewrite';

export interface AutoAcceptHandlers {
  onRewriteStart?: () => void;
  onRewriteAccept?: (rewrite: string) => void;
  onRewriteError?: (error: Error) => void;
}

/**
 * Side-effect bridge for SmartParaphrase*: when SmartRewrite's status
 * transitions to 'ready', immediately call accept() (which routes the rewrite
 * back through SmartRewrite's onChange → consumer's onChange). Also fires
 * lifecycle callbacks on transitions.
 */
export function useAutoAccept(state: SmartRewriteRenderArgs, handlers: AutoAcceptHandlers) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const prevStatusRef = useRef(state.status);

  useEffect(() => {
    const prev = prevStatusRef.current;
    const next = state.status;
    prevStatusRef.current = next;

    if (prev !== 'loading' && next === 'loading') {
      handlersRef.current.onRewriteStart?.();
    }
    if (next === 'ready' && state.rewrite) {
      handlersRef.current.onRewriteAccept?.(state.rewrite);
      state.accept();
    }
    if (next === 'error' && state.error) {
      handlersRef.current.onRewriteError?.(state.error);
    }
  }, [state]);
}
