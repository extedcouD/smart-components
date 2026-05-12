import { useCallback, useEffect, useRef, useState } from 'react';
import { useSmartClient } from '../provider/useSmartClient';
import { assertCapability } from '../provider/types';
import { useLRU } from './useLRU';
import { buildRewritePrompt, DEFAULT_REWRITE_INSTRUCTION } from '../utils/buildPrompt';

export type RewriteStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseRewriteOptions {
  value: string;
  instruction?: string;
  context?: string;
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
  /** Called by `accept()` with the final rewrite. */
  onAccept?: (rewrite: string) => void;
}

export interface UseRewriteResult {
  rewrite: string;
  status: RewriteStatus;
  error: Error | null;
  /** Trigger a rewrite. Optional override replaces the default instruction. */
  run: (instructionOverride?: string) => void;
  /** Commit the current rewrite via onAccept and reset to idle. */
  accept: () => void;
  /** Discard the current rewrite and return to idle. */
  reject: () => void;
}

export function useRewrite(opts: UseRewriteOptions): UseRewriteResult {
  const {
    value,
    instruction,
    context,
    stream = false,
    maxTokens = 512,
    temperature = 0.4,
    onAccept,
  } = opts;

  const { client, model, defaultSystem } = useSmartClient();
  const cache = useLRU<string, string>(16);

  const [rewrite, setRewrite] = useState('');
  const [status, setStatus] = useState<RewriteStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const cancelInFlight = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  // Abort any pending request on unmount.
  useEffect(() => cancelInFlight, [cancelInFlight]);

  const run = useCallback(
    (instructionOverride?: string) => {
      const finalInstruction = instructionOverride ?? instruction ?? DEFAULT_REWRITE_INSTRUCTION;
      if (!value) {
        setRewrite('');
        setStatus('idle');
        setError(null);
        return;
      }

      cancelInFlight();
      const key = `${finalInstruction}|${value}`;
      const cached = cache.get(key);
      if (cached !== undefined) {
        setRewrite(cached);
        setStatus(cached ? 'ready' : 'idle');
        setError(null);
        return;
      }

      const ac = new AbortController();
      abortRef.current = ac;
      const { system, prompt } = buildRewritePrompt({
        value,
        instruction: finalInstruction,
        context,
      });
      const fullSystem = defaultSystem ? `${defaultSystem}\n\n${system}` : system;

      setRewrite('');
      setStatus('loading');
      setError(null);

      (async () => {
        try {
          if (stream) {
            assertCapability(client, 'stream');
            let acc = '';
            for await (const chunk of client.stream({
              prompt,
              system: fullSystem,
              model,
              signal: ac.signal,
              maxTokens,
              temperature,
            })) {
              if (ac.signal.aborted) return;
              acc += chunk;
              setRewrite(acc);
            }
            if (ac.signal.aborted) return;
            cache.set(key, acc);
            setStatus(acc ? 'ready' : 'idle');
          } else {
            assertCapability(client, 'complete');
            const text = await client.complete({
              prompt,
              system: fullSystem,
              model,
              signal: ac.signal,
              maxTokens,
              temperature,
            });
            if (ac.signal.aborted) return;
            cache.set(key, text);
            setRewrite(text);
            setStatus(text ? 'ready' : 'idle');
          }
        } catch (e) {
          if (ac.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return;
          setError(e instanceof Error ? e : new Error(String(e)));
          setStatus('error');
        } finally {
          if (abortRef.current === ac) abortRef.current = null;
        }
      })();
    },
    [client, model, defaultSystem, value, instruction, context, stream, maxTokens, temperature, cache, cancelInFlight],
  );

  const accept = useCallback(() => {
    if (!rewrite) return;
    onAccept?.(rewrite);
    setRewrite('');
    setStatus('idle');
    setError(null);
  }, [rewrite, onAccept]);

  const reject = useCallback(() => {
    cancelInFlight();
    setRewrite('');
    setStatus('idle');
    setError(null);
  }, [cancelInFlight]);

  return { rewrite, status, error, run, accept, reject };
}
