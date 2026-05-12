import {
  SMART_CLIENT_PROTOCOL_VERSION,
  type CompleteRequest,
  type CompleteResponse,
  type EmbedRequest,
  type EmbedResponse,
  type SmartCapability,
  type SmartClient,
} from '../../provider/types';
import type {
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  ChatMessage,
} from '../../provider/chat-types';
import { uuid } from '../../utils/uuid';

export interface MockClientOptions {
  /** Function called for `complete` requests. */
  complete?: (req: CompleteRequest) => string | Promise<string>;
  /** Function called for `stream` requests. Yields chunks. */
  stream?: (req: CompleteRequest) => Iterable<string> | AsyncIterable<string>;
  /** Function called for `embed` requests. */
  embed?: (req: EmbedRequest) => number[][] | Promise<number[][]>;
  /** Function called for `chat` requests. Return either a full ChatResponse
   *  or a string (which is wrapped as a text-only assistant reply). */
  chat?: (req: ChatRequest) => string | ChatResponse | Promise<string | ChatResponse>;
  /** Function called for `chatStream` requests. Yield either pre-shaped
   *  ChatStreamChunk events or plain strings (auto-wrapped as text-deltas
   *  with synthesized message-start/finish). */
  chatStream?: (
    req: ChatRequest,
  ) => Iterable<ChatStreamChunk | string> | AsyncIterable<ChatStreamChunk | string>;
  /** Artificial latency in ms applied to each call. */
  latencyMs?: number;
  /** Optional id (defaults to "mock"). */
  id?: string;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (signal) {
      if (signal.aborted) {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

export function createMockClient(opts: MockClientOptions = {}): SmartClient {
  const caps = new Set<SmartCapability>();
  if (opts.complete) caps.add('complete');
  if (opts.stream) caps.add('stream');
  if (opts.embed) caps.add('embed');
  if (opts.chat) caps.add('chat');
  if (opts.chatStream) caps.add('chatStream');

  const latency = opts.latencyMs ?? 0;

  const client: SmartClient = {
    protocolVersion: SMART_CLIENT_PROTOCOL_VERSION,
    id: opts.id ?? 'mock',
    capabilities: caps,
  };

  if (opts.complete) {
    const fn = opts.complete;
    Object.assign(client, {
      async complete(req: CompleteRequest): Promise<CompleteResponse> {
        await delay(latency, req.signal);
        return fn(req);
      },
    });
  }

  if (opts.stream) {
    const fn = opts.stream;
    Object.assign(client, {
      async *stream(req: CompleteRequest): AsyncIterable<string> {
        await delay(latency, req.signal);
        for await (const chunk of fn(req) as AsyncIterable<string>) {
          if (req.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
          yield chunk;
        }
      },
    });
  }

  if (opts.embed) {
    const fn = opts.embed;
    Object.assign(client, {
      async embed(req: EmbedRequest): Promise<EmbedResponse> {
        await delay(latency, req.signal);
        return fn(req);
      },
    });
  }

  if (opts.chat) {
    const fn = opts.chat;
    Object.assign(client, {
      async chat(req: ChatRequest): Promise<ChatResponse> {
        await delay(latency, req.signal);
        const result = await fn(req);
        if (typeof result === 'string') {
          const message: ChatMessage = {
            id: uuid(),
            role: 'assistant',
            content: [{ type: 'text', text: result }],
          };
          return { message, finishReason: 'stop' };
        }
        return result;
      },
    });
  }

  if (opts.chatStream) {
    const fn = opts.chatStream;
    Object.assign(client, {
      async *chatStream(req: ChatRequest): AsyncIterable<ChatStreamChunk> {
        await delay(latency, req.signal);
        const source = fn(req) as AsyncIterable<ChatStreamChunk | string> | Iterable<ChatStreamChunk | string>;
        const messageId = uuid();
        let startedStructured = false;
        let startedWrapped = false;
        let finishedStructured = false;

        for await (const chunk of source as AsyncIterable<ChatStreamChunk | string>) {
          if (req.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
          if (typeof chunk === 'string') {
            if (!startedWrapped) {
              startedWrapped = true;
              yield { type: 'message-start', messageId };
            }
            yield { type: 'text-delta', messageId, text: chunk };
          } else {
            startedStructured = true;
            if (chunk.type === 'finish') finishedStructured = true;
            yield chunk;
          }
        }
        if (startedWrapped && !startedStructured) {
          yield { type: 'finish', messageId, finishReason: 'stop' };
        } else if (startedStructured && !finishedStructured) {
          yield { type: 'finish', messageId, finishReason: 'stop' };
        } else if (!startedWrapped && !startedStructured) {
          yield { type: 'message-start', messageId };
          yield { type: 'finish', messageId, finishReason: 'stop' };
        }
      },
    });
  }

  return client;
}
