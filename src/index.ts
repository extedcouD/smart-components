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
  ChatRole,
  ChatImageSource,
  ChatContentBlock,
  ChatMessage,
  SmartTool,
  ChatToolChoice,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  ChatFinishReason,
  ChatUsage,
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

export { SmartChat, SmartChatComposer } from './components/SmartChat';
export type {
  SmartChatProps,
  SmartChatHandle,
  SmartChatComposerProps,
  SmartChatComposerHandle,
} from './components/SmartChat';

export {
  useGhostCompletion,
  useSuggestionList,
  useRewrite,
  useChat,
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
  UseChatOptions,
  UseChatResult,
  ChatStatus,
  PendingToolCall,
  LRU,
} from './hooks';
