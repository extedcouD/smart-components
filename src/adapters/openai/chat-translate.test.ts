import { describe, it, expect } from 'vitest';
import {
  toOpenAIMessages,
  toOpenAITools,
  parseOpenAIChatResponse,
  parseOpenAIChatSse,
} from './chat-translate';
import type { ChatMessage, ChatStreamChunk } from '../../provider/chat-types';

function sseResponseOf(lines: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const l of lines) controller.enqueue(enc.encode(l + '\n'));
      controller.close();
    },
  });
  return new Response(body, { headers: { 'content-type': 'text/event-stream' } });
}

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const c of iter) out.push(c);
  return out;
}

describe('openai chat-translate', () => {
  it('maps user text content to a string', () => {
    const msgs: ChatMessage[] = [
      { id: 'u1', role: 'user', content: [{ type: 'text', text: 'hello' }] },
    ];
    const out = toOpenAIMessages(msgs, 'sys');
    expect(out).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'hello' },
    ]);
  });

  it('maps mixed text+image to OpenAI mixed-content array', () => {
    const msgs: ChatMessage[] = [
      {
        id: 'u1',
        role: 'user',
        content: [
          { type: 'image', source: { kind: 'base64', data: 'abc', mediaType: 'image/png' } },
          { type: 'text', text: 'what?' },
        ],
      },
    ];
    const out = toOpenAIMessages(msgs);
    expect(out).toHaveLength(1);
    const content = out[0]!.content as Array<{ type: string }>;
    expect(Array.isArray(content)).toBe(true);
    expect(content).toHaveLength(2);
    const first = content[0] as { type: string; image_url: { url: string } };
    expect(first.type).toBe('image_url');
    expect(first.image_url.url).toBe('data:image/png;base64,abc');
    expect(content[1]!.type).toBe('text');
  });

  it('maps assistant tool_call blocks to tool_calls field', () => {
    const msgs: ChatMessage[] = [
      {
        id: 'a1',
        role: 'assistant',
        content: [{ type: 'tool_call', id: 'tc1', name: 'get_weather', arguments: { city: 'NYC' } }],
      },
    ];
    const out = toOpenAIMessages(msgs);
    expect(out[0]!.role).toBe('assistant');
    expect(out[0]!.tool_calls).toEqual([
      {
        id: 'tc1',
        type: 'function',
        function: { name: 'get_weather', arguments: '{"city":"NYC"}' },
      },
    ]);
  });

  it('maps tool-role message to per-result OpenAI tool messages', () => {
    const msgs: ChatMessage[] = [
      {
        id: 't1',
        role: 'tool',
        content: [{ type: 'tool_result', toolCallId: 'tc1', result: { temp: 72 } }],
      },
    ];
    const out = toOpenAIMessages(msgs);
    expect(out).toEqual([
      { role: 'tool', tool_call_id: 'tc1', content: '{"temp":72}' },
    ]);
  });

  it('toOpenAITools wraps each as function tool', () => {
    const out = toOpenAITools([
      { name: 'foo', description: 'd', parameters: { type: 'object' } },
    ]);
    expect(out).toEqual([
      { type: 'function', function: { name: 'foo', description: 'd', parameters: { type: 'object' } } },
    ]);
  });

  it('parseOpenAIChatResponse builds ChatResponse with text + tool_calls', () => {
    const r = parseOpenAIChatResponse({
      choices: [
        {
          message: {
            content: 'hi',
            tool_calls: [{ id: 'tc1', type: 'function', function: { name: 'foo', arguments: '{"a":1}' } }],
          },
          finish_reason: 'tool_calls',
        },
      ],
      usage: { prompt_tokens: 4, completion_tokens: 9 },
    });
    expect(r.finishReason).toBe('tool_calls');
    expect(r.usage).toEqual({ promptTokens: 4, completionTokens: 9 });
    expect(r.message.content).toEqual([
      { type: 'text', text: 'hi' },
      { type: 'tool_call', id: 'tc1', name: 'foo', arguments: { a: 1 } },
    ]);
  });

  it('parseOpenAIChatSse yields text-delta + finish for plain text stream', async () => {
    const res = sseResponseOf([
      'data: {"choices":[{"delta":{"content":"He"}}]}',
      'data: {"choices":[{"delta":{"content":"llo"}}]}',
      'data: {"choices":[{"finish_reason":"stop","delta":{}}]}',
      'data: [DONE]',
    ]);
    const chunks = await collect(parseOpenAIChatSse(res));
    const types = chunks.map((c) => c.type);
    expect(types[0]).toBe('message-start');
    expect(types).toContain('text-delta');
    expect(types[types.length - 1]).toBe('finish');
    const deltas = chunks.filter((c): c is Extract<ChatStreamChunk, { type: 'text-delta' }> => c.type === 'text-delta');
    expect(deltas.map((d) => d.text).join('')).toBe('Hello');
  });

  it('parseOpenAIChatSse handles streamed tool calls', async () => {
    const res = sseResponseOf([
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"tc1","type":"function","function":{"name":"foo","arguments":""}}]}}]}',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"a\\":"}}]}}]}',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"1}"}}]}}]}',
      'data: {"choices":[{"finish_reason":"tool_calls","delta":{}}]}',
      'data: [DONE]',
    ]);
    const chunks = await collect(parseOpenAIChatSse(res));
    const start = chunks.find((c) => c.type === 'tool-call-start');
    const end = chunks.find((c) => c.type === 'tool-call-end');
    expect(start).toBeTruthy();
    expect(end).toBeTruthy();
    if (end?.type === 'tool-call-end') {
      expect(end.arguments).toEqual({ a: 1 });
    }
  });
});
