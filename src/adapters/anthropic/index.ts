import {
  SMART_CLIENT_PROTOCOL_VERSION,
  type CompleteRequest,
  type CompleteResponse,
  type SmartCapability,
  type SmartClient,
} from '../../provider/types';

export interface AnthropicClientOptions {
  /** Anthropic API key. NEVER ship in browser code for production — use `createProxyClient` instead. */
  apiKey: string;
  /** Default model used when a request doesn't specify one. */
  defaultModel?: string;
  /** Override the API base URL. */
  baseUrl?: string;
  /** Extra headers added to every request. */
  headers?: Record<string, string>;
  /** Anthropic API version header. Default: '2023-06-01'. */
  anthropicVersion?: string;
  /** Default `max_tokens` if the request doesn't set one (Anthropic requires it). Default: 1024. */
  defaultMaxTokens?: number;
  /** Allow browser-side calls. Sends the `anthropic-dangerous-direct-browser-access` header.
   *  Off by default; with it off, browser calls will fail with CORS. */
  dangerouslyAllowBrowser?: boolean;
  /** Silence the browser-key safety warning. */
  silenceBrowserWarning?: boolean;
}

const DEFAULT_BASE = 'https://api.anthropic.com/v1';

interface MessagesResponse {
  content?: Array<{ type?: string; text?: string }>;
}

interface MessagesStreamEvent {
  type?: string;
  delta?: { type?: string; text?: string };
}

function warnIfBrowser(silenced: boolean | undefined): void {
  if (silenced) return;
  if (typeof window !== 'undefined') {
    console.warn(
      '[smart-components/adapters/anthropic] createAnthropicClient is running in the browser. ' +
        'Your Anthropic API key is exposed to anyone who opens devtools. ' +
        'For production, use `createProxyClient` and call Anthropic from your backend.',
    );
  }
}

function buildBody(req: CompleteRequest, model: string, defaultMaxTokens: number, stream: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    max_tokens: req.maxTokens ?? defaultMaxTokens,
    messages: [{ role: 'user', content: req.prompt }],
  };
  if (req.system) body.system = req.system;
  if (req.temperature !== undefined) body.temperature = req.temperature;
  if (req.stop?.length) body.stop_sequences = req.stop;
  if (stream) body.stream = true;
  return body;
}

async function* parseMessagesSse(res: Response, signal?: AbortSignal): AsyncIterable<string> {
  if (!res.body) throw new Error('[smart-components/anthropic] response has no body');
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
        try {
          const evt = JSON.parse(data) as MessagesStreamEvent;
          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta' && evt.delta.text) {
            yield evt.delta.text;
          } else if (evt.type === 'message_stop') {
            return;
          }
        } catch {
          // ignore malformed lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function createAnthropicClient(opts: AnthropicClientOptions): SmartClient {
  warnIfBrowser(opts.silenceBrowserWarning);

  const baseUrl = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '');
  const defaultModel = opts.defaultModel ?? 'claude-3-5-sonnet-latest';
  const defaultMaxTokens = opts.defaultMaxTokens ?? 1024;

  const baseHeaders: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': opts.apiKey,
    'anthropic-version': opts.anthropicVersion ?? '2023-06-01',
    ...(opts.dangerouslyAllowBrowser ? { 'anthropic-dangerous-direct-browser-access': 'true' } : {}),
    ...opts.headers,
  };

  const pickModel = (req: CompleteRequest): string => req.model ?? defaultModel;

  async function postMessages(body: unknown, signal?: AbortSignal): Promise<Response> {
    const res = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(
        `[smart-components/anthropic] ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ''}`,
      );
    }
    return res;
  }

  return {
    protocolVersion: SMART_CLIENT_PROTOCOL_VERSION,
    id: 'anthropic',
    capabilities: new Set<SmartCapability>(['complete', 'stream']),

    async complete(req: CompleteRequest): Promise<CompleteResponse> {
      const body = buildBody(req, pickModel(req), defaultMaxTokens, false);
      const res = await postMessages(body, req.signal);
      const json = (await res.json()) as MessagesResponse;
      return json.content?.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('') ?? '';
    },

    async *stream(req: CompleteRequest): AsyncIterable<string> {
      const body = buildBody(req, pickModel(req), defaultMaxTokens, true);
      const res = await postMessages(body, req.signal);
      yield* parseMessagesSse(res, req.signal);
    },
  };
}
