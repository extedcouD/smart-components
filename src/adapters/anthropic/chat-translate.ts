import type {
  ChatContentBlock,
  ChatFinishReason,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  ChatToolChoice,
  SmartTool,
} from '../../provider/chat-types';
import { uuid } from '../../utils/uuid';

// Anthropic wire-format types (subset we use).

type AntTextBlock = { type: 'text'; text: string };
type AntImageBlock = {
  type: 'image';
  source:
    | { type: 'base64'; media_type: string; data: string }
    | { type: 'url'; url: string };
};
type AntToolUseBlock = { type: 'tool_use'; id: string; name: string; input: unknown };
type AntToolResultBlock = {
  type: 'tool_result';
  tool_use_id: string;
  content: string | AntTextBlock[];
  is_error?: boolean;
};
type AntContentBlock = AntTextBlock | AntImageBlock | AntToolUseBlock | AntToolResultBlock;

interface AntMessage {
  role: 'user' | 'assistant';
  content: AntContentBlock[];
}

interface AntTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

type AntToolChoice =
  | { type: 'auto' }
  | { type: 'any' }
  | { type: 'tool'; name: string }
  | { type: 'none' };

export interface AnthropicChatBody {
  model: string;
  messages: AntMessage[];
  system?: string;
  max_tokens: number;
  temperature?: number;
  stop_sequences?: string[];
  tools?: AntTool[];
  tool_choice?: AntToolChoice;
  stream?: boolean;
}

function mapBlock(block: ChatContentBlock): AntContentBlock | null {
  if (block.type === 'text') return { type: 'text', text: block.text };
  if (block.type === 'image') {
    if (block.source.kind === 'base64') {
      return {
        type: 'image',
        source: {
          type: 'base64',
          media_type: block.source.mediaType ?? 'image/png',
          data: block.source.data,
        },
      };
    }
    return { type: 'image', source: { type: 'url', url: block.source.data } };
  }
  if (block.type === 'tool_call') {
    const input = typeof block.arguments === 'string' ? safeParse(block.arguments) : block.arguments;
    return { type: 'tool_use', id: block.id, name: block.name, input: input ?? {} };
  }
  // tool_result
  const result = block.result;
  return {
    type: 'tool_result',
    tool_use_id: block.toolCallId,
    content: typeof result === 'string' ? result : JSON.stringify(result),
    is_error: block.isError,
  };
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export function toAnthropicMessages(messages: ChatMessage[]): AntMessage[] {
  const out: AntMessage[] = [];
  for (const m of messages) {
    if (m.role === 'system') continue; // anthropic system goes top-level
    // Anthropic only supports user/assistant roles in messages. Our 'tool' role
    // (carrying tool_result blocks) maps to a user message in Anthropic's model.
    const role: 'user' | 'assistant' = m.role === 'assistant' ? 'assistant' : 'user';
    const content: AntContentBlock[] = [];
    for (const b of m.content) {
      const mapped = mapBlock(b);
      if (mapped) content.push(mapped);
    }
    if (content.length === 0) continue;
    out.push({ role, content });
  }
  return out;
}

export function toAnthropicTools(tools?: SmartTool[]): AntTool[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));
}

export function toAnthropicToolChoice(choice?: ChatToolChoice): AntToolChoice | undefined {
  if (!choice) return undefined;
  if (choice === 'auto') return { type: 'auto' };
  if (choice === 'none') return { type: 'none' };
  return { type: 'tool', name: choice.name };
}

export function buildAnthropicChatBody(
  req: ChatRequest,
  model: string,
  stream: boolean,
  defaultMaxTokens: number,
): AnthropicChatBody {
  const systemFromMessages = req.messages.find((m) => m.role === 'system');
  const systemText = req.system
    ?? (systemFromMessages
      ? systemFromMessages.content.filter((b) => b.type === 'text').map((b) => (b as AntTextBlock).text).join('\n')
      : undefined);

  return {
    model,
    messages: toAnthropicMessages(req.messages),
    system: systemText,
    max_tokens: req.maxTokens ?? defaultMaxTokens,
    temperature: req.temperature,
    stop_sequences: req.stop,
    tools: toAnthropicTools(req.tools),
    tool_choice: toAnthropicToolChoice(req.toolChoice),
    stream: stream || undefined,
  };
}

// ─── Response parsing ────────────────────────────────────────────────────────

function mapStopReason(reason: string | null | undefined): ChatFinishReason {
  switch (reason) {
    case 'max_tokens':
      return 'length';
    case 'tool_use':
      return 'tool_calls';
    case 'stop_sequence':
    case 'end_turn':
    case null:
    case undefined:
      return 'stop';
    default:
      return 'stop';
  }
}

interface AntChatResponse {
  id?: string;
  content?: AntContentBlock[];
  stop_reason?: string | null;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export function parseAnthropicChatResponse(json: AntChatResponse): ChatResponse {
  const content: ChatContentBlock[] = [];
  for (const b of json.content ?? []) {
    if (b.type === 'text') content.push({ type: 'text', text: b.text });
    else if (b.type === 'tool_use')
      content.push({ type: 'tool_call', id: b.id, name: b.name, arguments: b.input });
  }
  const message: ChatMessage = { id: json.id ?? uuid(), role: 'assistant', content };
  const finishReason = mapStopReason(json.stop_reason);
  const usage = json.usage
    ? { promptTokens: json.usage.input_tokens ?? 0, completionTokens: json.usage.output_tokens ?? 0 }
    : undefined;
  return { message, finishReason, usage };
}

// ─── Streaming SSE ───────────────────────────────────────────────────────────

interface AntStreamEvent {
  type: string;
  index?: number;
  message?: { id?: string; stop_reason?: string | null };
  content_block?: { type?: string; id?: string; name?: string };
  delta?: {
    type?: string;
    text?: string;
    partial_json?: string;
    stop_reason?: string | null;
  };
  usage?: { input_tokens?: number; output_tokens?: number };
}

interface BlockAcc {
  type: 'text' | 'tool_use';
  toolId?: string;
  toolName?: string;
  toolArgs?: string;
  emittedStart?: boolean;
}

/**
 * Translate an Anthropic /v1/messages SSE stream to provider-agnostic
 * ChatStreamChunk events.
 */
export async function* parseAnthropicChatSse(
  res: Response,
  signal?: AbortSignal,
): AsyncIterable<ChatStreamChunk> {
  if (!res.body) throw new Error('[smart-components/anthropic] chat stream has no body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let messageId: string | null = null;
  let finish: ChatFinishReason = 'stop';
  let usage: { promptTokens: number; completionTokens: number } | undefined;
  const blocks = new Map<number, BlockAcc>();
  let started = false;

  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Anthropic SSE separates events with double newlines; we split by single
      // newlines and rely on the `data:` line to carry the JSON. Event lines
      // (`event: foo`) are informational; `type` inside the JSON payload is
      // the authoritative discriminator.
      let nl: number;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line || line.startsWith(':') || !line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        let ev: AntStreamEvent;
        try {
          ev = JSON.parse(data) as AntStreamEvent;
        } catch {
          continue;
        }
        switch (ev.type) {
          case 'message_start': {
            messageId = ev.message?.id ?? uuid();
            started = true;
            yield { type: 'message-start', messageId };
            if (ev.usage) {
              usage = {
                promptTokens: ev.usage.input_tokens ?? 0,
                completionTokens: ev.usage.output_tokens ?? 0,
              };
            }
            break;
          }
          case 'content_block_start': {
            if (ev.index == null || !ev.content_block) break;
            const cb = ev.content_block;
            if (cb.type === 'tool_use') {
              const acc: BlockAcc = {
                type: 'tool_use',
                toolId: cb.id ?? `call_${ev.index}`,
                toolName: cb.name ?? '',
                toolArgs: '',
              };
              blocks.set(ev.index, acc);
              if (messageId && acc.toolName) {
                acc.emittedStart = true;
                yield {
                  type: 'tool-call-start',
                  messageId,
                  toolCallId: acc.toolId!,
                  name: acc.toolName,
                };
              }
            } else if (cb.type === 'text') {
              blocks.set(ev.index, { type: 'text' });
            }
            break;
          }
          case 'content_block_delta': {
            if (ev.index == null || !ev.delta || !messageId) break;
            const acc = blocks.get(ev.index);
            if (ev.delta.type === 'text_delta' && ev.delta.text) {
              yield { type: 'text-delta', messageId, text: ev.delta.text };
            } else if (ev.delta.type === 'input_json_delta' && ev.delta.partial_json && acc?.type === 'tool_use') {
              acc.toolArgs = (acc.toolArgs ?? '') + ev.delta.partial_json;
              if (acc.emittedStart && acc.toolId) {
                yield {
                  type: 'tool-call-delta',
                  messageId,
                  toolCallId: acc.toolId,
                  argumentsDelta: ev.delta.partial_json,
                };
              }
            }
            break;
          }
          case 'content_block_stop': {
            if (ev.index == null || !messageId) break;
            const acc = blocks.get(ev.index);
            if (acc?.type === 'tool_use' && acc.emittedStart && acc.toolId) {
              let args: unknown = {};
              try {
                args = acc.toolArgs ? JSON.parse(acc.toolArgs) : {};
              } catch {
                args = acc.toolArgs;
              }
              yield { type: 'tool-call-end', messageId, toolCallId: acc.toolId, arguments: args };
            }
            break;
          }
          case 'message_delta': {
            if (ev.delta?.stop_reason) finish = mapStopReason(ev.delta.stop_reason);
            if (ev.usage) {
              usage = {
                promptTokens: usage?.promptTokens ?? 0,
                completionTokens: ev.usage.output_tokens ?? usage?.completionTokens ?? 0,
              };
            }
            break;
          }
          case 'message_stop': {
            // finalize below
            break;
          }
          default:
            break;
        }
      }
    }
  } catch (e) {
    if (signal?.aborted || (e instanceof DOMException && e.name === 'AbortError')) {
      throw e;
    }
    yield { type: 'error', error: e instanceof Error ? e : new Error(String(e)) };
    return;
  } finally {
    reader.releaseLock();
  }

  if (!started) {
    messageId = messageId ?? uuid();
    yield { type: 'message-start', messageId };
  }
  yield { type: 'finish', messageId: messageId ?? uuid(), finishReason: finish, usage };
}
