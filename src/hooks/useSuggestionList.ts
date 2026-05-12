/* eslint-disable react-hooks/set-state-in-effect -- effect drives a fetch state machine; clearing on short-circuit is intentional */
import { useEffect, useState } from 'react';
import { useSmartClient } from '../provider/useSmartClient';
import { assertCapability } from '../provider/types';
import { useDebouncedValue } from './useDebouncedValue';
import { useLRU } from './useLRU';
import { buildSuggestionPrompt, parseSuggestionResponse } from '../utils/buildPrompt';

export type SuggestionStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseSuggestionListOptions {
  value: string;
  context?: string;
  count?: number;
  debounceMs?: number;
  minChars?: number;
  enabled?: boolean;
}

export interface UseSuggestionListResult {
  items: string[];
  status: SuggestionStatus;
  error: Error | null;
}

export function useSuggestionList(opts: UseSuggestionListOptions): UseSuggestionListResult {
  const { value, context, count = 5, debounceMs = 300, minChars = 1, enabled = true } = opts;
  const { client, model, defaultSystem } = useSmartClient();
  const debouncedValue = useDebouncedValue(value, debounceMs);
  const cache = useLRU<string, string[]>(64);

  const [items, setItems] = useState<string[]>([]);
  const [status, setStatus] = useState<SuggestionStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || debouncedValue.length < minChars) {
      setItems([]);
      setStatus('idle');
      return;
    }

    const key = `${context ?? ''}|${count}|${debouncedValue}`;
    const cached = cache.get(key);
    if (cached !== undefined) {
      setItems(cached);
      setStatus(cached.length ? 'ready' : 'idle');
      return;
    }

    const ac = new AbortController();
    const { system, prompt } = buildSuggestionPrompt({ value: debouncedValue, context, count });
    const fullSystem = defaultSystem ? `${defaultSystem}\n\n${system}` : system;
    setStatus('loading');
    setError(null);

    (async () => {
      try {
        assertCapability(client, 'complete');
        const text = await client.complete({
          prompt,
          system: fullSystem,
          model,
          signal: ac.signal,
          temperature: 0.3,
        });
        if (ac.signal.aborted) return;
        const parsed = parseSuggestionResponse(text).slice(0, count);
        cache.set(key, parsed);
        setItems(parsed);
        setStatus(parsed.length ? 'ready' : 'idle');
      } catch (e) {
        if (ac.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus('error');
      }
    })();

    return () => {
      ac.abort();
    };
  }, [client, model, defaultSystem, debouncedValue, context, count, minChars, enabled, cache]);

  return { items, status, error };
}
