export { SmartProvider } from './SmartProvider';
export type { SmartProviderProps } from './SmartProvider';
export { useSmartClient } from './useSmartClient';
export type { SmartContextValue } from './context';
export {
  SMART_CLIENT_PROTOCOL_VERSION,
  assertCapability,
  hasCapability,
} from './types';
export type {
  SmartClient,
  SmartClientProtocolVersion,
  SmartCapability,
  CompleteRequest,
  CompleteResponse,
  EmbedRequest,
  EmbedResponse,
} from './types';
export type {
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
} from './chat-types';
