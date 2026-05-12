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
export type { SmartTextboxProps } from './components/SmartTextbox';

export { SmartSuggestion } from './components/SmartSuggestion';
export type { SmartSuggestionProps, SmartSuggestionRenderItemArgs } from './components/SmartSuggestion';

export {
  useGhostCompletion,
  useSuggestionList,
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
  LRU,
} from './hooks';
