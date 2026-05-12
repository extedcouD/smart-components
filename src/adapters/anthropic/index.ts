import {
  SMART_CLIENT_PROTOCOL_VERSION,
  type SmartCapability,
  type SmartClient,
} from '../../provider/types';
import type { ChatRequest, ChatResponse, ChatStreamChunk } from '../../provider/chat-types';
import {
  buildAnthropicChatBody,
  parseAnthropicChatResponse,
  parseAnthropicChatSse,
} from './chat-translate';

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

  const pickModel = (req: ChatRequest): string => req.model ?? defaultModel;

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
    capabilities: new Set<SmartCapability>(['chat', 'chatStream']),

    async chat(req: ChatRequest): Promise<ChatResponse> {
      const body = buildAnthropicChatBody(req, pickModel(req), false, defaultMaxTokens);
      const res = await postMessages(body, req.signal);
      const json = await res.json();
      return parseAnthropicChatResponse(json);
    },

    async *chatStream(req: ChatRequest): AsyncIterable<ChatStreamChunk> {
      const body = buildAnthropicChatBody(req, pickModel(req), true, defaultMaxTokens);
      const res = await postMessages(body, req.signal);
      yield* parseAnthropicChatSse(res, req.signal);
    },
  };
}
