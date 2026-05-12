import OpenAI from 'openai';
import {
  SMART_CLIENT_PROTOCOL_VERSION,
  type CompleteRequest,
  type CompleteResponse,
  type SmartCapability,
  type SmartClient,
} from '../../provider/types';

export interface OpenAIClientOptions {
  /** OpenAI API key. NEVER ship in browser code for production — use `createProxyClient` instead. */
  apiKey: string;
  /** Default model used when a request doesn't specify one. */
  defaultModel?: string;
  /** Pass extra options through to the OpenAI SDK constructor. */
  openai?: ConstructorParameters<typeof OpenAI>[0];
  /** Silence the browser-key safety warning. Only set if you fully understand the risk. */
  silenceBrowserWarning?: boolean;
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

export function createOpenAIClient(opts: OpenAIClientOptions): SmartClient {
  warnIfBrowser(opts.silenceBrowserWarning);

  const openai = new OpenAI({
    apiKey: opts.apiKey,
    dangerouslyAllowBrowser: typeof window !== 'undefined',
    ...opts.openai,
  });

  const caps = new Set<SmartCapability>(['complete', 'stream']);

  const pickModel = (req: CompleteRequest): string => req.model ?? opts.defaultModel ?? 'gpt-4o-mini';

  function buildMessages(req: CompleteRequest): { role: 'system' | 'user'; content: string }[] {
    const msgs: { role: 'system' | 'user'; content: string }[] = [];
    if (req.system) msgs.push({ role: 'system', content: req.system });
    msgs.push({ role: 'user', content: req.prompt });
    return msgs;
  }

  return {
    protocolVersion: SMART_CLIENT_PROTOCOL_VERSION,
    id: 'openai',
    capabilities: caps,

    async complete(req: CompleteRequest): Promise<CompleteResponse> {
      const res = await openai.chat.completions.create(
        {
          model: pickModel(req),
          messages: buildMessages(req),
          max_tokens: req.maxTokens,
          temperature: req.temperature,
          stop: req.stop,
        },
        { signal: req.signal },
      );
      return res.choices[0]?.message?.content ?? '';
    },

    async *stream(req: CompleteRequest): AsyncIterable<string> {
      const stream = await openai.chat.completions.create(
        {
          model: pickModel(req),
          messages: buildMessages(req),
          max_tokens: req.maxTokens,
          temperature: req.temperature,
          stop: req.stop,
          stream: true,
        },
        { signal: req.signal },
      );
      for await (const chunk of stream) {
        if (req.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) yield delta;
      }
    },
  };
}
