import {
  SMART_CLIENT_PROTOCOL_VERSION,
  type CompleteRequest,
  type CompleteResponse,
  type EmbedRequest,
  type EmbedResponse,
  type SmartCapability,
  type SmartClient,
} from '../../provider/types';

export interface MockClientOptions {
  /** Function called for `complete` requests. */
  complete?: (req: CompleteRequest) => string | Promise<string>;
  /** Function called for `stream` requests. Yields chunks. */
  stream?: (req: CompleteRequest) => Iterable<string> | AsyncIterable<string>;
  /** Function called for `embed` requests. */
  embed?: (req: EmbedRequest) => number[][] | Promise<number[][]>;
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

  return client;
}
