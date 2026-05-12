/* eslint-disable react-hooks/set-state-in-effect -- effect drives a fetch state machine; clearing on short-circuit is intentional */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSmartClient } from '../provider/useSmartClient';
import { assertCapability } from '../provider/types';
import { useDebouncedValue } from './useDebouncedValue';
import { useLRU } from './useLRU';
import { buildCompletionPrompt } from '../utils/buildPrompt';

export type GhostStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseGhostCompletionOptions {
  value: string;
  context?: string;
  debounceMs?: number;
  minChars?: number;
  stream?: boolean;
  enabled?: boolean;
  maxTokens?: number;
  /** Stop sequences forwarded to the client (e.g., ['\n\n'] for multiline mode). */
  stop?: string[];
  /** Hint prompt builder that the input is multiline. */
  multiline?: boolean;
}

export interface UseGhostCompletionResult {
  suggestion: string;
  status: GhostStatus;
  error: Error | null;
  dismiss: () => void;
}

export function useGhostCompletion(opts: UseGhostCompletionOptions): UseGhostCompletionResult {
  const {
    value,
    context,
    debounceMs = 300,
    minChars = 3,
    stream = false,
    enabled = true,
    maxTokens = 32,
    stop,
    multiline = false,
  } = opts;

  const { client, model, defaultSystem } = useSmartClient();
  const debouncedValue = useDebouncedValue(value, debounceMs);
  const cache = useLRU<string, string>(64);

  const [suggestion, setSuggestion] = useState('');
  const [status, setStatus] = useState<GhostStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const dismissedForRef = useRef<string | null>(null);

  // Stable identity for stop array so it doesn't retrigger the effect every render.
  const stopKey = stop ? stop.join('') : '';
  const stopStable = useMemo(() => stop, [stopKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback(() => {
    dismissedForRef.current = debouncedValue;
    setSuggestion('');
    setStatus('idle');
  }, [debouncedValue]);

  useEffect(() => {
    if (debouncedValue.length < minChars) {
      setSuggestion('');
      setStatus('idle');
      return;
    }
    if (dismissedForRef.current === debouncedValue) {
      return;
    }
    if (!enabled) {
      // Don't fetch when disabled, but DON'T clear the suggestion either —
      // preserves it across a blur+tap race (observed in Samsung Internet,
      // which doesn't honor pointerdown.preventDefault for blur prevention).
      // Ghost is hidden visually via the consumer-side `ghostVisible` gate;
      // the data stays alive so the tap-on-ghost click can still commit it.
      return;
    }

    const key = `${context ?? ''} ${debouncedValue}`;
    const cached = cache.get(key);
    if (cached !== undefined) {
      setSuggestion(cached);
      setStatus(cached ? 'ready' : 'idle');
      return;
    }

    const ac = new AbortController();
    const { system, prompt } = buildCompletionPrompt({ value: debouncedValue, context, multiline });
    const fullSystem = defaultSystem ? `${defaultSystem}\n\n${system}` : system;
    setStatus('loading');
    setError(null);

    (async () => {
      try {
        if (stream) {
          assertCapability(client, 'stream');
          let acc = '';
          setSuggestion('');
          for await (const chunk of client.stream({
            prompt,
            system: fullSystem,
            model,
            signal: ac.signal,
            maxTokens,
            stop: stopStable,
          })) {
            if (ac.signal.aborted) return;
            if (dismissedForRef.current === debouncedValue) return;
            acc += chunk;
            setSuggestion(acc);
          }
          if (ac.signal.aborted || dismissedForRef.current === debouncedValue) return;
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
            stop: stopStable,
          });
          if (ac.signal.aborted) return;
          if (dismissedForRef.current === debouncedValue) return;
          cache.set(key, text);
          setSuggestion(text);
          setStatus(text ? 'ready' : 'idle');
        }
      } catch (e) {
        if (ac.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus('error');
      }
    })();

    return () => {
      ac.abort();
    };
  }, [client, model, defaultSystem, debouncedValue, context, minChars, stream, enabled, maxTokens, multiline, stopStable, cache]);

  return { suggestion, status, error, dismiss };
}
