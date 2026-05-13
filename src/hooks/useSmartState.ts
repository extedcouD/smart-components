import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useSmartClient } from '../provider/useSmartClient';
import { assertCapability } from '../provider/types';
import { useLRU } from './useLRU';
import { buildSmartStatePrompt, parseStructuredResponse } from '../utils/buildPrompt';
import { introspectShape, type ShapeDescriptor } from '../utils/shape';

export type SmartStateStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseSmartStateOptions<T> {
  /** Escape hatch when `initial` is null/undefined/empty and can't be introspected. */
  shape?: ShapeDescriptor;
  /** Cache responses by (shape + context). Default: true (LRU 16). */
  cache?: boolean;
  /** Max tokens for the generate call. Default: 512. */
  maxTokens?: number;
  /** Sampling temperature. Default: 0.7. */
  temperature?: number;
  /** Fires after a successful generate(), with the parsed value. */
  onGenerate?: (value: T) => void;
}

export interface SmartStateAI<T> {
  /** Ask the LLM to produce a value matching T's runtime shape. */
  generate: (contextOverride?: string) => void;
  status: SmartStateStatus;
  error: Error | null;
  /** Reset status/error back to idle (does not change value). */
  reset: () => void;
  // T is part of the public type so consumers can extract it via SmartStateAI<typeof v>.
  readonly __t?: T;
}

export type UseSmartStateReturn<T> = readonly [T, Dispatch<SetStateAction<T>>, SmartStateAI<T>];

/**
 * useState-like hook with an `ai.generate(context?)` extra that fills the
 * value via the SmartClient's `complete` capability. The runtime shape is
 * derived from `initial` (works in JS and TS). If `initial` is null/empty,
 * pass `options.shape` instead.
 *
 * Calling `setValue` mid-generate cancels the in-flight call — the user's
 * manual edit beats the AI.
 */
export function useSmartState<T>(
  initial: T | (() => T),
  defaultContext?: string,
  options: UseSmartStateOptions<T> = {},
): UseSmartStateReturn<T> {
  const {
    shape: shapeOpt,
    cache: cacheEnabled = true,
    maxTokens = 512,
    temperature = 0.7,
    onGenerate,
  } = options;

  const { client, model, defaultSystem } = useSmartClient();
  const cache = useLRU<string, string>(16);

  const [value, setValue] = useState<T>(initial);
  const [status, setStatus] = useState<SmartStateStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Resolve the shape once, on first render. Prefer options.shape, else
  // introspect the initial value. May remain null until generate() is called.
  const shapeRef = useRef<ShapeDescriptor | null>(null);
  if (shapeRef.current === null) {
    shapeRef.current = shapeOpt ?? introspectShape(value);
  }

  const onGenerateRef = useRef(onGenerate);
  useEffect(() => {
    onGenerateRef.current = onGenerate;
  });

  const cancelInFlight = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  // Cancel any pending request on unmount.
  useEffect(() => cancelInFlight, [cancelInFlight]);

  const wrappedSetValue = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      cancelInFlight();
      setStatus((s) => (s === 'loading' ? 'idle' : s));
      setValue(next);
    },
    [cancelInFlight],
  );

  const generate = useCallback(
    (contextOverride?: string) => {
      const shape = shapeRef.current;
      if (!shape) {
        setError(
          new Error(
            'useSmartState: cannot infer shape. Pass options.shape or a non-empty initial value.',
          ),
        );
        setStatus('error');
        return;
      }

      cancelInFlight();
      const ctx = contextOverride ?? defaultContext;
      const key = `${JSON.stringify(shape)}|${ctx ?? ''}`;

      if (cacheEnabled) {
        const cached = cache.get(key);
        if (cached !== undefined) {
          const parsed = parseStructuredResponse(cached, shape);
          if (parsed.ok) {
            setValue(parsed.value as T);
            setStatus('ready');
            setError(null);
            onGenerateRef.current?.(parsed.value as T);
            return;
          }
        }
      }

      assertCapability(client, 'complete');
      const ac = new AbortController();
      abortRef.current = ac;
      const { system, prompt } = buildSmartStatePrompt({ shape, context: ctx });
      const fullSystem = defaultSystem ? `${defaultSystem}\n\n${system}` : system;

      setStatus('loading');
      setError(null);

      (async () => {
        try {
          const text = await client.complete!({
            prompt,
            system: fullSystem,
            model,
            signal: ac.signal,
            maxTokens,
            temperature,
          });
          if (ac.signal.aborted) return;
          const parsed = parseStructuredResponse(text, shape);
          if (!parsed.ok) {
            setError(new Error(`useSmartState: invalid response — ${parsed.reason}`));
            setStatus('error');
            return;
          }
          if (cacheEnabled) cache.set(key, text);
          setValue(parsed.value as T);
          setStatus('ready');
          onGenerateRef.current?.(parsed.value as T);
        } catch (e) {
          if (ac.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return;
          setError(e instanceof Error ? e : new Error(String(e)));
          setStatus('error');
        } finally {
          if (abortRef.current === ac) abortRef.current = null;
        }
      })();
    },
    [client, model, defaultSystem, defaultContext, cacheEnabled, maxTokens, temperature, cache, cancelInFlight],
  );

  const reset = useCallback(() => {
    cancelInFlight();
    setStatus('idle');
    setError(null);
  }, [cancelInFlight]);

  const ai = useMemo<SmartStateAI<T>>(
    () => ({ generate, status, error, reset }),
    [generate, status, error, reset],
  );

  return [value, wrappedSetValue, ai] as const;
}
