import { useCallback, type ReactNode } from 'react';
import { useRewrite, type UseRewriteResult } from '../../hooks/useRewrite';
import { DEFAULT_REWRITE_PRESETS, type SmartRewritePreset } from './presets';

export interface SmartRewriteRenderArgs extends UseRewriteResult {
  value: string;
  presets: ReadonlyArray<SmartRewritePreset>;
}

export interface SmartRewriteProps {
  /** Current text (controlled). */
  value: string;
  /** Called when the user accepts the rewrite. */
  onChange: (value: string) => void;
  /** Default instruction; overridable per `run()` call. */
  instruction?: string;
  /** Optional context string included in the prompt. */
  context?: string;
  /** Presets exposed to the render-prop (consumer wires the buttons). */
  presets?: ReadonlyArray<SmartRewritePreset>;
  /** Stream chunks as they arrive (better UX on long rewrites). Default: false. */
  stream?: boolean;
  /** Max tokens for the rewrite call. Default: 512. */
  maxTokens?: number;
  /** Sampling temperature. Default: 0.4. */
  temperature?: number;
  /** Render-prop. The component renders no DOM of its own. */
  children: (args: SmartRewriteRenderArgs) => ReactNode;
}

export function SmartRewrite({
  value,
  onChange,
  instruction,
  context,
  presets = DEFAULT_REWRITE_PRESETS,
  stream = false,
  maxTokens = 512,
  temperature = 0.4,
  children,
}: SmartRewriteProps) {
  const handleAccept = useCallback((rewrite: string) => onChange(rewrite), [onChange]);

  const state = useRewrite({
    value,
    instruction,
    context,
    stream,
    maxTokens,
    temperature,
    onAccept: handleAccept,
  });

  return <>{children({ ...state, value, presets })}</>;
}
