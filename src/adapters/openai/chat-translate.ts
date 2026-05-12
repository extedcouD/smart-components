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

// OpenAI wire-format types (subset we use).

interface OAITextPart {
  type: 'text';
  text: string;
}
interface OAIImagePart {
  type: 'image_url';
  image_url: { url: string };
}
type OAIContent = string | Array<OAITextPart | OAIImagePart>;

interface OAIToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface OAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: OAIContent;
  tool_calls?: OAIToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface OAITool {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

type OAIToolChoice =
  | 'auto'
  | 'none'
  | { type: 'function'; function: { name: string } };

export interface OpenAIChatBody {
  model: string;
  messages: OAIMessage[];
  tools?: OAITool[];
  tool_choice?: OAIToolChoice;
  max_tokens?: number;
  temperature?: number;
  stop?: string[];
  stream?: boolean;
}

function imageUrl(source: { kind: 'url' | 'base64'; data: string; mediaType?: string }): string {
  if (source.kind === 'url') return source.data;
  const mt = source.mediaType ?? 'image/png';
  return `data:${mt};base64,${source.data}`;
}

function toOAIContent(blocks: ChatContentBlock[]): OAIContent | undefined {
  const parts: Array<OAITextPart | OAIImagePart> = [];
  for (const b of blocks) {
    if (b.type === 'text') parts.push({ type: 'text', text: b.text });
    else if (b.type === 'image') parts.push({ type: 'image_url', image_url: { url: imageUrl(b.source) } });
  }
  if (parts.length === 0) return undefined;
  if (parts.length === 1 && parts[0]!.type === 'text') return (parts[0] as OAITextPart).text;
  return parts;
}

function collectToolCalls(blocks: ChatContentBlock[]): OAIToolCall[] | undefined {
  const calls = blocks.filter((b): b is Extract<ChatContentBlock, { type: 'tool_call' }> => b.type === 'tool_call');
  if (calls.length === 0) return undefined;
  return calls.map((c) => ({
    id: c.id,
    type: 'function',
    function: { name: c.name, arguments: typeof c.arguments === 'string' ? c.arguments : JSON.stringify(c.arguments ?? {}) },
  }));
}

export function toOpenAIMessages(messages: ChatMessage[], system?: string): OAIMessage[] {
  const out: OAIMessage[] = [];
  if (system) out.push({ role: 'system', content: system });

  for (const m of messages) {
    if (m.role === 'tool') {
      // Each tool_result becomes a separate openai 'tool' message.
      for (const block of m.content) {
        if (block.type === 'tool_result') {
          const result = block.result;
          out.push({
            role: 'tool',
            tool_call_id: block.toolCallId,
            content: typeof result === 'string' ? result : JSON.stringify(result),
          });
        }
      }
      continue;
    }
    if (m.role === 'system') {
      const content = toOAIContent(m.content);
      if (content != null) out.push({ role: 'system', content });
      continue;
    }
    if (m.role === 'user') {
      const content = toOAIContent(m.content);
      out.push({ role: 'user', content: content ?? '' });
      continue;
    }
    // assistant
    const content = toOAIContent(m.content);
    const toolCalls = collectToolCalls(m.content);
    const msg: OAIMessage = { role: 'assistant' };
    if (content != null) msg.content = content;
    if (toolCalls) msg.tool_calls = toolCalls;
    out.push(msg);
  }
  return out;
}

export function toOpenAITools(tools?: SmartTool[]): OAITool[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

export function toOpenAIToolChoice(choice?: ChatToolChoice): OAIToolChoice | undefined {
  if (!choice) return undefined;
  if (choice === 'auto' || choice === 'none') return choice;
  return { type: 'function', function: { name: choice.name } };
}

export function buildOpenAIChatBody(req: ChatRequest, model: string, stream: boolean): OpenAIChatBody {
  return {
    model,
    messages: toOpenAIMessages(req.messages, req.system),
    tools: toOpenAITools(req.tools),
    tool_choice: toOpenAIToolChoice(req.toolChoice),
    max_tokens: req.maxTokens,
    temperature: req.temperature,
    stop: req.stop,
    stream: stream || undefined,
  };
}

// ─── Response parsing ────────────────────────────────────────────────────────

interface OAIRespChoice {
  message?: {
    role?: string;
    content?: string | null;
    tool_calls?: Array<{ id: string; type?: string; function?: { name?: string; arguments?: string } }>;
  };
  finish_reason?: string | null;
}
interface OAIChatResponse {
  choices?: OAIRespChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

function mapFinish(reason: string | null | undefined): ChatFinishReason {
  switch (reason) {
    case 'length':
      return 'length';
    case 'tool_calls':
    case 'function_call':
      return 'tool_calls';
    case 'stop':
    case null:
    case undefined:
      return 'stop';
    default:
      return 'stop';
  }
}

export function parseOpenAIChatResponse(json: OAIChatResponse): ChatResponse {
  const choice = json.choices?.[0];
  const content: ChatContentBlock[] = [];
  const text = choice?.message?.content;
  if (typeof text === 'string' && text.length > 0) content.push({ type: 'text', text });
  for (const tc of choice?.message?.tool_calls ?? []) {
    let args: unknown = {};
    try {
      args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
    } catch {
      args = tc.function?.arguments ?? '';
    }
    content.push({ type: 'tool_call', id: tc.id, name: tc.function?.name ?? '', arguments: args });
  }
  const message: ChatMessage = { id: uuid(), role: 'assistant', content };
  const finishReason = mapFinish(choice?.finish_reason);
  const usage = json.usage
    ? { promptTokens: json.usage.prompt_tokens ?? 0, completionTokens: json.usage.completion_tokens ?? 0 }
    : undefined;
  return { message, finishReason, usage };
}

// ─── Streaming SSE ───────────────────────────────────────────────────────────

interface OAIStreamChoice {
  delta?: {
    role?: string;
    content?: string | null;
    tool_calls?: Array<{
      index?: number;
      id?: string;
      type?: string;
      function?: { name?: string; arguments?: string };
    }>;
  };
  finish_reason?: string | null;
}
interface OAIStreamChunk {
  choices?: OAIStreamChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

interface ToolCallAcc {
  id: string;
  name: string;
  args: string;
  emittedStart: boolean;
  emittedEnd: boolean;
}

/**
 * Translate an OpenAI Chat Completions SSE stream to provider-agnostic
 * ChatStreamChunk events. Yields exactly one `message-start` and one `finish`
 * (or `error`) per response. Tool calls produce start/delta/end events; the
 * `arguments` field on `tool-call-end` is the parsed JSON (or raw string if
 * parsing fails).
 */
export async function* parseOpenAIChatSse(
  res: Response,
  signal?: AbortSignal,
): AsyncIterable<ChatStreamChunk> {
  if (!res.body) throw new Error('[smart-components/openai] chat stream has no body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const messageId = uuid();
  yield { type: 'message-start', messageId };

  let buffer = '';
  let finish: ChatFinishReason = 'stop';
  let usage: { promptTokens: number; completionTokens: number } | undefined;
  const tools = new Map<number, ToolCallAcc>();

  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line || line.startsWith(':') || !line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') {
          // [DONE] is a synthetic OpenAI marker; finish_reason was set earlier
          // in the stream — fall through to finalization below.
          buffer = '';
          break;
        }
        let parsed: OAIStreamChunk;
        try {
          parsed = JSON.parse(data) as OAIStreamChunk;
        } catch {
          continue;
        }
        if (parsed.usage) {
          usage = {
            promptTokens: parsed.usage.prompt_tokens ?? 0,
            completionTokens: parsed.usage.completion_tokens ?? 0,
          };
        }
        const choice = parsed.choices?.[0];
        if (!choice) continue;
        const delta = choice.delta;
        if (delta?.content) {
          yield { type: 'text-delta', messageId, text: delta.content };
        }
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            let acc = tools.get(idx);
            if (!acc) {
              acc = {
                id: tc.id ?? `call_${idx}_${messageId}`,
                name: tc.function?.name ?? '',
                args: '',
                emittedStart: false,
                emittedEnd: false,
              };
              tools.set(idx, acc);
            } else {
              if (tc.id && !acc.id) acc.id = tc.id;
              if (tc.function?.name && !acc.name) acc.name = tc.function.name;
            }
            if (!acc.emittedStart && acc.name) {
              acc.emittedStart = true;
              yield { type: 'tool-call-start', messageId, toolCallId: acc.id, name: acc.name };
            }
            const argDelta = tc.function?.arguments;
            if (argDelta) {
              acc.args += argDelta;
              if (acc.emittedStart) {
                yield {
                  type: 'tool-call-delta',
                  messageId,
                  toolCallId: acc.id,
                  argumentsDelta: argDelta,
                };
              }
            }
          }
        }
        if (choice.finish_reason) {
          finish = mapFinish(choice.finish_reason);
        }
      }
    }
  } catch (e) {
    if (signal?.aborted || (e instanceof DOMException && e.name === 'AbortError')) {
      // bubble abort to the consumer of the iterator
      throw e;
    }
    yield { type: 'error', error: e instanceof Error ? e : new Error(String(e)) };
    return;
  } finally {
    reader.releaseLock();
  }

  // Flush any in-progress tool calls (emit start if name arrived late, then end).
  for (const acc of tools.values()) {
    if (!acc.emittedStart && acc.name) {
      yield { type: 'tool-call-start', messageId, toolCallId: acc.id, name: acc.name };
      acc.emittedStart = true;
    }
    if (!acc.emittedEnd && acc.emittedStart) {
      let args: unknown = {};
      try {
        args = acc.args ? JSON.parse(acc.args) : {};
      } catch {
        args = acc.args;
      }
      acc.emittedEnd = true;
      yield { type: 'tool-call-end', messageId, toolCallId: acc.id, arguments: args };
    }
  }

  yield { type: 'finish', messageId, finishReason: finish, usage };
}
