import {
  SMART_CLIENT_PROTOCOL_VERSION,
  type CompleteRequest,
  type CompleteResponse,
  type SmartCapability,
  type SmartClient,
} from '../../provider/types';
import type { ChatRequest, ChatResponse, ChatStreamChunk } from '../../provider/chat-types';
import {
  buildOpenAIChatBody,
  parseOpenAIChatResponse,
  parseOpenAIChatSse,
} from './chat-translate';

export interface OpenAIClientOptions {
  /** OpenAI API key. NEVER ship in browser code for production — use `createProxyClient` instead. */
  apiKey: string;
  /** Default model used when a request doesn't specify one. */
  defaultModel?: string;
  /** Override the API base URL (e.g. for Azure OpenAI or a self-hosted proxy). */
  baseUrl?: string;
  /** Extra headers added to every request. */
  headers?: Record<string, string>;
  /** Silence the browser-key safety warning. Only set if you fully understand the risk. */
  silenceBrowserWarning?: boolean;
}

const DEFAULT_BASE = 'https://api.openai.com/v1';

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface ChatCompletionChunk {
  choices?: Array<{ delta?: { content?: string } }>;
}

function buildMessages(req: CompleteRequest): ChatMessage[] {
  const msgs: ChatMessage[] = [];
  if (req.system) msgs.push({ role: 'system', content: req.system });
  msgs.push({ role: 'user', content: req.prompt });
  return msgs;
}

function warnIfBrowser(silenced: boolean | undefined): void {
  if (silenced) return;
  if (typeof window !== 'undefined') {
    console.warn(
      '[smart-components/adapters/openai] createOpenAIClient is running in the browser. ' +
        'Your OpenAI API key is exposed to anyone who opens devtools. ' +
        'For production, use `createProxyClient` and call OpenAI from your backend.',
    );
  }
}

async function* parseChatSse(res: Response, signal?: AbortSignal): AsyncIterable<string> {
  if (!res.body) throw new Error('[smart-components/openai] response has no body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line || line.startsWith(':') || !line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') return;
        try {
          const chunk = JSON.parse(data) as ChatCompletionChunk;
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // ignore malformed lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function createOpenAIClient(opts: OpenAIClientOptions): SmartClient {
  warnIfBrowser(opts.silenceBrowserWarning);

  const baseUrl = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '');
  const pickModel = (req: CompleteRequest): string =>
    req.model ?? opts.defaultModel ?? 'gpt-4o-mini';

  async function postChat(body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${opts.apiKey}`,
        ...opts.headers,
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(
        `[smart-components/openai] ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ''}`,
      );
    }
    return res;
  }

  const pickChatModel = (req: ChatRequest): string =>
    req.model ?? opts.defaultModel ?? 'gpt-4o-mini';

  return {
    protocolVersion: SMART_CLIENT_PROTOCOL_VERSION,
    id: 'openai',
    capabilities: new Set<SmartCapability>(['complete', 'stream', 'chat', 'chatStream']),

    async complete(req: CompleteRequest): Promise<CompleteResponse> {
      const res = await postChat(
        {
          model: pickModel(req),
          messages: buildMessages(req),
          max_tokens: req.maxTokens,
          temperature: req.temperature,
          stop: req.stop,
        },
        req.signal,
      );
      const json = (await res.json()) as ChatCompletionResponse;
      return json.choices?.[0]?.message?.content ?? '';
    },

    async *stream(req: CompleteRequest): AsyncIterable<string> {
      const res = await postChat(
        {
          model: pickModel(req),
          messages: buildMessages(req),
          max_tokens: req.maxTokens,
          temperature: req.temperature,
          stop: req.stop,
          stream: true,
        },
        req.signal,
      );
      yield* parseChatSse(res, req.signal);
    },

    async chat(req: ChatRequest): Promise<ChatResponse> {
      const body = buildOpenAIChatBody(req, pickChatModel(req), false);
      const res = await postChat(body as unknown as Record<string, unknown>, req.signal);
      const json = await res.json();
      return parseOpenAIChatResponse(json);
    },

    async *chatStream(req: ChatRequest): AsyncIterable<ChatStreamChunk> {
      const body = buildOpenAIChatBody(req, pickChatModel(req), true);
      const res = await postChat(body as unknown as Record<string, unknown>, req.signal);
      yield* parseOpenAIChatSse(res, req.signal);
    },
  };
}
