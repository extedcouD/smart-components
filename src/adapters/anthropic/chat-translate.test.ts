import { describe, it, expect } from 'vitest';
import {
  toAnthropicMessages,
  toAnthropicTools,
  buildAnthropicChatBody,
  parseAnthropicChatResponse,
  parseAnthropicChatSse,
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

describe('anthropic chat-translate', () => {
  it('maps text + image base64 content blocks', () => {
    const msgs: ChatMessage[] = [
      {
        id: 'u1',
        role: 'user',
        content: [
          { type: 'image', source: { kind: 'base64', data: 'abc', mediaType: 'image/jpeg' } },
          { type: 'text', text: 'what?' },
        ],
      },
    ];
    const out = toAnthropicMessages(msgs);
    expect(out).toHaveLength(1);
    expect(out[0]!.role).toBe('user');
    expect(out[0]!.content[0]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: 'abc' },
    });
    expect(out[0]!.content[1]).toEqual({ type: 'text', text: 'what?' });
  });

  it('maps image URL source', () => {
    const msgs: ChatMessage[] = [
      {
        id: 'u1',
        role: 'user',
        content: [{ type: 'image', source: { kind: 'url', data: 'https://example.com/x.png' } }],
      },
    ];
    const out = toAnthropicMessages(msgs);
    expect(out[0]!.content[0]).toEqual({
      type: 'image',
      source: { type: 'url', url: 'https://example.com/x.png' },
    });
  });

  it('maps assistant tool_call → tool_use, tool-role tool_result → user tool_result', () => {
    const msgs: ChatMessage[] = [
      {
        id: 'a1',
        role: 'assistant',
        content: [{ type: 'tool_call', id: 'tu1', name: 'foo', arguments: { x: 1 } }],
      },
      {
        id: 't1',
        role: 'tool',
        content: [{ type: 'tool_result', toolCallId: 'tu1', result: 'ok' }],
      },
    ];
    const out = toAnthropicMessages(msgs);
    expect(out[0]).toEqual({
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'tu1', name: 'foo', input: { x: 1 } }],
    });
    expect(out[1]).toEqual({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 'tu1', content: 'ok', is_error: undefined }],
    });
  });

  it('extracts system to top-level', () => {
    const body = buildAnthropicChatBody(
      {
        messages: [{ id: 'u1', role: 'user', content: [{ type: 'text', text: 'hi' }] }],
        system: 'be brief',
      },
      'claude-3-5-sonnet-latest',
      false,
      1024,
    );
    expect(body.system).toBe('be brief');
  });

  it('toAnthropicTools maps to {name, description, input_schema}', () => {
    const out = toAnthropicTools([
      { name: 'foo', description: 'd', parameters: { type: 'object' } },
    ]);
    expect(out).toEqual([{ name: 'foo', description: 'd', input_schema: { type: 'object' } }]);
  });

  it('parseAnthropicChatResponse extracts text + tool_use blocks', () => {
    const r = parseAnthropicChatResponse({
      id: 'msg_1',
      content: [
        { type: 'text', text: 'hi' },
        { type: 'tool_use', id: 'tu1', name: 'foo', input: { a: 1 } },
      ],
      stop_reason: 'tool_use',
      usage: { input_tokens: 3, output_tokens: 5 },
    });
    expect(r.message.id).toBe('msg_1');
    expect(r.message.content).toEqual([
      { type: 'text', text: 'hi' },
      { type: 'tool_call', id: 'tu1', name: 'foo', arguments: { a: 1 } },
    ]);
    expect(r.finishReason).toBe('tool_calls');
    expect(r.usage).toEqual({ promptTokens: 3, completionTokens: 5 });
  });

  it('parseAnthropicChatSse yields text-deltas for content_block_delta', async () => {
    const res = sseResponseOf([
      'data: {"type":"message_start","message":{"id":"msg_1"}}',
      'data: {"type":"content_block_start","index":0,"content_block":{"type":"text"}}',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"He"}}',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"llo"}}',
      'data: {"type":"content_block_stop","index":0}',
      'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}',
      'data: {"type":"message_stop"}',
    ]);
    const chunks = await collect(parseAnthropicChatSse(res));
    expect(chunks[0]!.type).toBe('message-start');
    const deltas = chunks.filter((c): c is Extract<ChatStreamChunk, { type: 'text-delta' }> => c.type === 'text-delta');
    expect(deltas.map((d) => d.text).join('')).toBe('Hello');
    expect(chunks[chunks.length - 1]!.type).toBe('finish');
  });

  it('parseAnthropicChatSse handles tool_use blocks with input_json_delta', async () => {
    const res = sseResponseOf([
      'data: {"type":"message_start","message":{"id":"msg_1"}}',
      'data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"tu1","name":"foo"}}',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"a\\":"}}',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"1}"}}',
      'data: {"type":"content_block_stop","index":0}',
      'data: {"type":"message_delta","delta":{"stop_reason":"tool_use"}}',
      'data: {"type":"message_stop"}',
    ]);
    const chunks = await collect(parseAnthropicChatSse(res));
    const start = chunks.find((c) => c.type === 'tool-call-start');
    const end = chunks.find((c) => c.type === 'tool-call-end');
    expect(start).toBeTruthy();
    if (end?.type === 'tool-call-end') expect(end.arguments).toEqual({ a: 1 });
  });
});
