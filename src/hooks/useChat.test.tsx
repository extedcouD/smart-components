import { describe, it, expect, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { SmartProvider } from '../provider/SmartProvider';
import { createMockClient, type MockClientOptions } from '../adapters/mock';
import { useChat, type UseChatOptions } from './useChat';
import type {
  ChatMessage,
  ChatResponse,
  ChatStreamChunk,
  SmartTool,
} from '../provider/chat-types';

function Wrap({ client, children }: { client: ReturnType<typeof createMockClient>; children: ReactNode }) {
  return <SmartProvider client={client}>{children}</SmartProvider>;
}

function makeWrapper(client: ReturnType<typeof createMockClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <Wrap client={client}>{children}</Wrap>;
  };
}

function makeClient(opts: MockClientOptions = {}) {
  return createMockClient(opts);
}

function lastAssistantText(msgs: ChatMessage[]): string {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i]!.role === 'assistant') {
      return msgs[i]!.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('');
    }
  }
  return '';
}

describe('useChat', () => {
  it('starts idle with empty messages', () => {
    const client = makeClient({ chat: () => 'hi' });
    const { result } = renderHook(() => useChat(), { wrapper: makeWrapper(client) });
    expect(result.current.messages).toEqual([]);
    expect(result.current.status).toBe('idle');
  });

  it('send appends user msg + assistant reply (non-streaming)', async () => {
    const client = makeClient({ chat: () => 'Hello back' });
    const { result } = renderHook(() => useChat({ stream: false }), {
      wrapper: makeWrapper(client),
    });
    act(() => {
      result.current.send('hi');
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]!.role).toBe('user');
    expect(result.current.messages[1]!.role).toBe('assistant');
    expect(lastAssistantText(result.current.messages)).toBe('Hello back');
  });

  it('streaming accumulates text-deltas into one assistant msg', async () => {
    async function* chatStream(): AsyncIterable<ChatStreamChunk> {
      const id = 'm1';
      yield { type: 'message-start', messageId: id };
      for (const chunk of ['Hel', 'lo, ', 'world']) {
        await new Promise((r) => setTimeout(r, 5));
        yield { type: 'text-delta', messageId: id, text: chunk };
      }
      yield { type: 'finish', messageId: id, finishReason: 'stop' };
    }
    const client = makeClient({ chatStream });
    const { result } = renderHook(() => useChat(), { wrapper: makeWrapper(client) });
    act(() => {
      result.current.send('hi');
    });
    await waitFor(() => expect(lastAssistantText(result.current.messages)).toBe('Hello, world'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    // Should still be one assistant message, not three.
    const assistants = result.current.messages.filter((m) => m.role === 'assistant');
    expect(assistants).toHaveLength(1);
  });

  it('stop() aborts an in-flight stream and lands ready', async () => {
    async function* slow(): AsyncIterable<ChatStreamChunk> {
      const id = 'm1';
      yield { type: 'message-start', messageId: id };
      for (const ch of ['a', 'b', 'c', 'd', 'e']) {
        await new Promise((r) => setTimeout(r, 20));
        yield { type: 'text-delta', messageId: id, text: ch };
      }
      yield { type: 'finish', messageId: id, finishReason: 'stop' };
    }
    const client = makeClient({ chatStream: slow });
    const { result } = renderHook(() => useChat(), { wrapper: makeWrapper(client) });
    act(() => {
      result.current.send('go');
    });
    await waitFor(() => expect(result.current.status).toBe('streaming'));
    act(() => {
      result.current.stop();
    });
    expect(result.current.status).toBe('ready');
    // Partial assistant message is kept
    expect(result.current.messages.filter((m) => m.role === 'assistant')).toHaveLength(1);
  });

  it('regenerate drops trailing assistant and re-runs', async () => {
    let n = 0;
    const client = makeClient({ chat: () => `reply ${++n}` });
    const { result } = renderHook(() => useChat({ stream: false }), {
      wrapper: makeWrapper(client),
    });
    act(() => {
      result.current.send('hi');
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(lastAssistantText(result.current.messages)).toBe('reply 1');

    act(() => {
      result.current.regenerate();
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(lastAssistantText(result.current.messages)).toBe('reply 2');
    expect(result.current.messages.filter((m) => m.role === 'user')).toHaveLength(1);
    expect(result.current.messages.filter((m) => m.role === 'assistant')).toHaveLength(1);
  });

  it('auto-executes tools and resumes the chat', async () => {
    let call = 0;
    const chat = vi.fn().mockImplementation((): ChatResponse => {
      call += 1;
      if (call === 1) {
        return {
          message: {
            id: 'a1',
            role: 'assistant',
            content: [{ type: 'tool_call', id: 'tc1', name: 'get_weather', arguments: { city: 'NYC' } }],
          },
          finishReason: 'tool_calls',
        };
      }
      return {
        message: { id: 'a2', role: 'assistant', content: [{ type: 'text', text: 'It is sunny.' }] },
        finishReason: 'stop',
      };
    });
    const tool: SmartTool = {
      name: 'get_weather',
      description: 'gets weather',
      parameters: { type: 'object' },
      execute: async ({ city }: { city: string }) => ({ temp: 72, city }),
    };
    const client = makeClient({ chat });
    const { result } = renderHook(() => useChat({ stream: false, tools: [tool] }), {
      wrapper: makeWrapper(client),
    });
    act(() => {
      result.current.send('weather?');
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(lastAssistantText(result.current.messages)).toBe('It is sunny.');
    const toolMsgs = result.current.messages.filter((m) => m.role === 'tool');
    expect(toolMsgs).toHaveLength(1);
    const block = toolMsgs[0]!.content[0]!;
    expect(block.type).toBe('tool_result');
    expect(chat).toHaveBeenCalledTimes(2);
  });

  it('exposes pendingToolCalls when autoExecuteTools=false', async () => {
    let call = 0;
    const chat = vi.fn().mockImplementation((): ChatResponse => {
      call += 1;
      if (call === 1) {
        return {
          message: {
            id: 'a1',
            role: 'assistant',
            content: [{ type: 'tool_call', id: 'tc1', name: 'noop', arguments: { x: 1 } }],
          },
          finishReason: 'tool_calls',
        };
      }
      return {
        message: { id: 'a2', role: 'assistant', content: [{ type: 'text', text: 'thanks' }] },
        finishReason: 'stop',
      };
    });
    const client = makeClient({ chat });
    const tool: SmartTool = { name: 'noop', description: 'no-op', parameters: { type: 'object' } };
    const { result } = renderHook(() =>
      useChat({ stream: false, tools: [tool], autoExecuteTools: false }),
      { wrapper: makeWrapper(client) },
    );
    act(() => {
      result.current.send('do');
    });
    await waitFor(() => expect(result.current.pendingToolCalls).toHaveLength(1));
    expect(result.current.status).toBe('ready');
    act(() => {
      result.current.submitToolResult('tc1', { ok: true });
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.pendingToolCalls).toHaveLength(0);
    expect(lastAssistantText(result.current.messages)).toBe('thanks');
    expect(chat).toHaveBeenCalledTimes(2);
  });

  it('send accepts ContentBlock[] for multimodal input', async () => {
    const chat = vi.fn().mockResolvedValue('saw an image');
    const client = makeClient({ chat });
    const { result } = renderHook(() => useChat({ stream: false }), {
      wrapper: makeWrapper(client),
    });
    act(() => {
      result.current.send([
        { type: 'image', source: { kind: 'base64', data: 'abc', mediaType: 'image/png' } },
        { type: 'text', text: 'what is this?' },
      ]);
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    const userMsg = result.current.messages[0]!;
    expect(userMsg.content).toHaveLength(2);
    expect(userMsg.content[0]!.type).toBe('image');
    expect(chat).toHaveBeenCalled();
    const req = chat.mock.calls[0]![0] as { messages: ChatMessage[] };
    expect(req.messages[0]!.content[0]!.type).toBe('image');
  });

  it('controlled mode: opts.messages drives state, onMessagesChange fires', async () => {
    const onChange = vi.fn();
    function Harness() {
      const [msgs, setMsgs] = useState<ChatMessage[]>([]);
      const client = makeClient({ chat: () => 'ok' });
      return (
        <SmartProvider client={client}>
          <Inner messages={msgs} onMessagesChange={(m) => { setMsgs(m); onChange(m); }} />
        </SmartProvider>
      );
    }
    function Inner(props: UseChatOptions) {
      const { send, messages, status } = useChat({ ...props, stream: false });
      return (
        <div>
          <div data-testid="status">{status}</div>
          <div data-testid="count">{messages.length}</div>
          <button data-testid="send" onClick={() => send('hi')}>send</button>
        </div>
      );
    }
    render(<Harness />);
    await act(async () => {
      screen.getByTestId('send').click();
    });
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('count')).toHaveTextContent('2');
    expect(onChange).toHaveBeenCalled();
  });

  it('error path: client has no chat capability', async () => {
    const client = makeClient({});
    const { result } = renderHook(() => useChat(), { wrapper: makeWrapper(client) });
    act(() => {
      result.current.send('hi');
    });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.message).toMatch(/missing capability/);
  });

  it('reset clears messages and aborts in-flight', async () => {
    async function* slow(): AsyncIterable<ChatStreamChunk> {
      yield { type: 'message-start', messageId: 'a' };
      for (const ch of ['a', 'b', 'c']) {
        await new Promise((r) => setTimeout(r, 20));
        yield { type: 'text-delta', messageId: 'a', text: ch };
      }
      yield { type: 'finish', messageId: 'a', finishReason: 'stop' };
    }
    const client = makeClient({ chatStream: slow });
    const { result } = renderHook(() => useChat(), { wrapper: makeWrapper(client) });
    act(() => {
      result.current.send('go');
    });
    await waitFor(() => expect(result.current.messages.length).toBeGreaterThan(0));
    act(() => {
      result.current.reset();
    });
    expect(result.current.messages).toEqual([]);
    expect(result.current.status).toBe('idle');
  });
});
