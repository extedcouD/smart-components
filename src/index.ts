export {
  SmartProvider,
  useSmartClient,
  SMART_CLIENT_PROTOCOL_VERSION,
  assertCapability,
  hasCapability,
} from './provider';
export type {
  SmartClient,
  SmartClientProtocolVersion,
  SmartCapability,
  CompleteRequest,
  CompleteResponse,
  EmbedRequest,
  EmbedResponse,
  SmartProviderProps,
  SmartContextValue,
} from './provider';

export { SmartTextbox } from './components/SmartTextbox';
export type { SmartTextboxProps, SmartTextboxHandle } from './components/SmartTextbox';

export { SmartTextarea } from './components/SmartTextarea';
export type { SmartTextareaProps, SmartTextareaHandle } from './components/SmartTextarea';

export { SmartSuggestion } from './components/SmartSuggestion';
export type { SmartSuggestionProps, SmartSuggestionRenderItemArgs } from './components/SmartSuggestion';

export { SmartRewrite, DEFAULT_REWRITE_PRESETS } from './components/SmartRewrite';
export type {
  SmartRewriteProps,
  SmartRewritePreset,
  SmartRewriteRenderArgs,
} from './components/SmartRewrite';

export {
  SmartParaphraseBox,
  SmartParaphraseArea,
} from './components/SmartParaphrase';
export type {
  SmartParaphraseBoxProps,
  SmartParaphraseBoxHandle,
  SmartParaphraseAreaProps,
  SmartParaphraseAreaHandle,
  ParaphraseButtonRenderArgs,
} from './components/SmartParaphrase';

export {
  useGhostCompletion,
  useSuggestionList,
  useRewrite,
  useSmartState,
  useDebouncedValue,
  useLRU,
} from './hooks';
export type {
  UseGhostCompletionOptions,
  UseGhostCompletionResult,
  GhostStatus,
  UseSuggestionListOptions,
  UseSuggestionListResult,
  SuggestionStatus,
  UseRewriteOptions,
  UseRewriteResult,
  RewriteStatus,
  UseSmartStateOptions,
  UseSmartStateReturn,
  SmartStateAI,
  SmartStateStatus,
  LRU,
} from './hooks';

export type { ShapeDescriptor, ShapeLeaf } from './utils/shape';
