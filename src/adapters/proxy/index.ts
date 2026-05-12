import {
  SMART_CLIENT_PROTOCOL_VERSION,
  type CompleteRequest,
  type CompleteResponse,
  type EmbedRequest,
  type EmbedResponse,
  type SmartCapability,
  type SmartClient,
} from '../../provider/types';
import type { ChatRequest, ChatResponse, ChatStreamChunk } from '../../provider/chat-types';
import { uuid } from '../../utils/uuid';

export interface ProxyClientOptions {
  /** Endpoint URL the adapter POSTs to. */
  url: string;
  /** Extra headers (e.g. auth) added to every request. */
  headers?: Record<string, string>;
  /** Capabilities this proxy is known to support. Defaults to ['complete', 'stream']. */
  capabilities?: SmartCapability[];
  /**
   * Customize the outgoing fetch body. Default: `JSON.stringify({ capability, ...req, signal: undefined })`.
   * Use this if your backend has a different schema.
   */
  transformRequest?: (capability: SmartCapability, req: unknown) => BodyInit;
  /**
   * Customize how a non-streaming response is parsed.
   * Default: `await res.json()` then return the response as-is for the matching capability.
   */
  transformResponse?: (capability: SmartCapability, res: Response) => Promise<unknown>;
  /** Optional id (defaults to "proxy"). */
  id?: string;
}

function defaultTransformRequest(capability: SmartCapability, req: unknown): BodyInit {
  const cloned: Record<string, unknown> = { capability };
  for (const [k, v] of Object.entries(req as Record<string, unknown>)) {
    if (k !== 'signal') cloned[k] = v;
  }
  return JSON.stringify(cloned);
}

async function defaultTransformResponse(_capability: SmartCapability, res: Response): Promise<unknown> {
  if (!res.ok) {
    throw new Error(`[smart-components/proxy] ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function* readChatSseStream(
  res: Response,
  signal?: AbortSignal,
): AsyncIterable<ChatStreamChunk> {
  if (!res.body) throw new Error('[smart-components/proxy] chat stream has no body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const fallbackMsgId = uuid();
  let messageStarted = false;
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
        if (!line || line.startsWith(':')) continue;
        const data = line.startsWith('data:') ? line.slice(5).trim() : line;
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data) as ChatStreamChunk | { delta?: string; text?: string };
          if ('type' in parsed && typeof parsed.type === 'string') {
            if (parsed.type === 'message-start') messageStarted = true;
            yield parsed as ChatStreamChunk;
          } else {
            // Bare {delta} / {text} envelope — wrap as text-delta.
            const text = (parsed as { delta?: string; text?: string }).delta
              ?? (parsed as { delta?: string; text?: string }).text;
            if (text) {
              if (!messageStarted) {
                messageStarted = true;
                yield { type: 'message-start', messageId: fallbackMsgId };
              }
              yield { type: 'text-delta', messageId: fallbackMsgId, text };
            }
          }
        } catch {
          // Not JSON — treat raw line as text delta.
          if (!messageStarted) {
            messageStarted = true;
            yield { type: 'message-start', messageId: fallbackMsgId };
          }
          yield { type: 'text-delta', messageId: fallbackMsgId, text: data };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function* readSseStream(res: Response, signal?: AbortSignal): AsyncIterable<string> {
  if (!res.body) throw new Error('[smart-components/proxy] response has no body');
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
        if (!line || line.startsWith(':')) continue;
        const data = line.startsWith('data:') ? line.slice(5).trim() : line;
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data) as { delta?: string; text?: string };
          const chunk = parsed.delta ?? parsed.text ?? '';
          if (chunk) yield chunk;
        } catch {
          // not JSON — yield raw
          if (data) yield data;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function createProxyClient(opts: ProxyClientOptions): SmartClient {
  const caps = new Set<SmartCapability>(opts.capabilities ?? ['complete', 'stream']);
  const transformRequest = opts.transformRequest ?? defaultTransformRequest;
  const transformResponse = opts.transformResponse ?? defaultTransformResponse;

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...opts.headers,
  };

  async function post(
    capability: SmartCapability,
    req: CompleteRequest | EmbedRequest | ChatRequest,
  ): Promise<Response> {
    return fetch(opts.url, {
      method: 'POST',
      headers,
      body: transformRequest(capability, req),
      signal: req.signal,
    });
  }

  const client: SmartClient = {
    protocolVersion: SMART_CLIENT_PROTOCOL_VERSION,
    id: opts.id ?? 'proxy',
    capabilities: caps,
  };

  if (caps.has('complete')) {
    Object.assign(client, {
      async complete(req: CompleteRequest): Promise<CompleteResponse> {
        const res = await post('complete', req);
        const parsed = (await transformResponse('complete', res)) as { text?: string } | string;
        return typeof parsed === 'string' ? parsed : (parsed.text ?? '');
      },
    });
  }

  if (caps.has('stream')) {
    Object.assign(client, {
      async *stream(req: CompleteRequest): AsyncIterable<string> {
        const res = await post('stream', req);
        if (!res.ok) {
          throw new Error(`[smart-components/proxy] ${res.status} ${res.statusText}`);
        }
        yield* readSseStream(res, req.signal);
      },
    });
  }

  if (caps.has('embed')) {
    Object.assign(client, {
      async embed(req: EmbedRequest): Promise<EmbedResponse> {
        const res = await post('embed', req);
        const parsed = (await transformResponse('embed', res)) as { vectors?: number[][] } | number[][];
        return Array.isArray(parsed) ? parsed : (parsed.vectors ?? []);
      },
    });
  }

  if (caps.has('chat')) {
    Object.assign(client, {
      async chat(req: ChatRequest): Promise<ChatResponse> {
        const res = await post('chat', req);
        const parsed = (await transformResponse('chat', res)) as ChatResponse;
        return parsed;
      },
    });
  }

  if (caps.has('chatStream')) {
    Object.assign(client, {
      async *chatStream(req: ChatRequest): AsyncIterable<ChatStreamChunk> {
        const res = await post('chatStream', req);
        if (!res.ok) {
          throw new Error(`[smart-components/proxy] ${res.status} ${res.statusText}`);
        }
        yield* readChatSseStream(res, req.signal);
      },
    });
  }

  return client;
}
