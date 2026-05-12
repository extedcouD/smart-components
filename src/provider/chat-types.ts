/**
 * Provider-agnostic chat protocol. Adapters translate between this and each
 * provider's wire format (OpenAI, Anthropic, etc.). Consumers code against
 * these types regardless of which adapter is plugged into SmartProvider.
 */

export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

/** Source of an image content block. `url` may be http(s) or a `data:` URL. */
export interface ChatImageSource {
  kind: 'url' | 'base64';
  data: string;
  /** e.g. 'image/png', 'image/jpeg'. Required for base64; ignored for URLs. */
  mediaType?: string;
}

export type ChatContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: ChatImageSource }
  | { type: 'tool_call'; id: string; name: string; arguments: unknown }
  | { type: 'tool_result'; toolCallId: string; result: unknown; isError?: boolean };

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: ChatContentBlock[];
  /** Unix ms. Optional — adapters/consumers may omit. */
  createdAt?: number;
  /** Free-form per-message extension point (e.g. UI state, citations). */
  metadata?: Record<string, unknown>;
}

export interface SmartTool {
  name: string;
  description: string;
  /** JSON Schema describing arguments. Both OpenAI + Anthropic expect this shape. */
  parameters: Record<string, unknown>;
  /**
   * Optional auto-handler. When `useChat({ autoExecuteTools: true })` (default),
   * the hook runs this on tool calls, appends a tool_result message, and resumes
   * the chat — zero-boilerplate tool calling.
   *
   * Typed as `any` for ergonomics; arguments come from JSON.parse so the runtime
   * shape is whatever the model emits. Validate at the start of your fn (or use
   * a schema lib) if you need certainty.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute?: (args: any, ctx: { signal: AbortSignal }) => Promise<unknown> | unknown;
}

export type ChatToolChoice = 'auto' | 'none' | { name: string };

export interface ChatRequest {
  messages: ChatMessage[];
  system?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: SmartTool[];
  toolChoice?: ChatToolChoice;
  stop?: string[];
  signal?: AbortSignal;
}

export type ChatFinishReason = 'stop' | 'length' | 'tool_calls' | 'error';

export interface ChatUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface ChatResponse {
  message: ChatMessage;
  finishReason: ChatFinishReason;
  usage?: ChatUsage;
}

/**
 * Streaming events. Beginners only need `text-delta`; the rest unlock streamed
 * tool calls. Adapters always emit `message-start` first and `finish` last
 * (`error` chunks may interleave or replace `finish` on failure).
 */
export type ChatStreamChunk =
  | { type: 'message-start'; messageId: string }
  | { type: 'text-delta'; messageId: string; text: string }
  | { type: 'tool-call-start'; messageId: string; toolCallId: string; name: string }
  | { type: 'tool-call-delta'; messageId: string; toolCallId: string; argumentsDelta: string }
  | { type: 'tool-call-end'; messageId: string; toolCallId: string; arguments: unknown }
  | { type: 'finish'; messageId: string; finishReason: ChatFinishReason; usage?: ChatUsage }
  | { type: 'error'; error: Error };
