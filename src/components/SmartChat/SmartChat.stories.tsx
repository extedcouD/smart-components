import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import { SmartProvider } from '../../provider/SmartProvider';
import { createMockClient } from '../../adapters/mock';
import { SmartChat } from './SmartChat';
import { SmartChatComposer } from './SmartChatComposer';
import type {
  ChatMessage,
  ChatStreamChunk,
  SmartTool,
} from '../../provider/chat-types';

// ─── Mock client w/ deterministic replies ───────────────────────────────────

function tokens(text: string): string[] {
  // Crude word/token split — good enough for streaming demos.
  return text.match(/\S+\s*|\s+/g) ?? [text];
}

function buildStreamingClient() {
  return createMockClient({
    latencyMs: 200,
    chatStream: async function* ({ messages, tools }): AsyncIterable<ChatStreamChunk> {
      const id = `m_${Date.now()}`;
      yield { type: 'message-start', messageId: id };

      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      const userText = lastUser?.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join(' ') ?? '';
      const hasImage = lastUser?.content.some((b) => b.type === 'image') ?? false;

      // If a weather tool is wired and the user asks about weather, emit a tool call.
      const weatherTool = tools?.find((t) => t.name === 'get_weather');
      if (weatherTool && /weather/i.test(userText) && !messages.some((m) => m.role === 'tool')) {
        const tcid = `tc_${Date.now()}`;
        yield { type: 'tool-call-start', messageId: id, toolCallId: tcid, name: 'get_weather' };
        const argsJson = JSON.stringify({ city: userText.match(/in\s+([A-Za-z ]+)/i)?.[1]?.trim() ?? 'NYC' });
        for (const c of argsJson.match(/.{1,6}/g) ?? []) {
          await new Promise((r) => setTimeout(r, 30));
          yield { type: 'tool-call-delta', messageId: id, toolCallId: tcid, argumentsDelta: c };
        }
        yield { type: 'tool-call-end', messageId: id, toolCallId: tcid, arguments: JSON.parse(argsJson) };
        yield { type: 'finish', messageId: id, finishReason: 'tool_calls' };
        return;
      }

      // Otherwise just stream a canned reply.
      const reply = hasImage
        ? 'I see your image. It appears to be a picture you uploaded.'
        : messages.some((m) => m.role === 'tool')
          ? `Based on the tool result, here is your answer.`
          : `You said: "${userText.slice(0, 80)}". Here is a streamed reply.`;
      for (const t of tokens(reply)) {
        await new Promise((r) => setTimeout(r, 30));
        yield { type: 'text-delta', messageId: id, text: t };
      }
      yield { type: 'finish', messageId: id, finishReason: 'stop' };
    },
    chat: async ({ messages }) => {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      const text = lastUser?.content.filter((b) => b.type === 'text').map((b) => (b as { type: 'text'; text: string }).text).join(' ') ?? '';
      return `You said: "${text}". Here is a non-streaming reply.`;
    },
  });
}

const sharedStyles = {
  panel: { width: 560, font: '14px ui-sans-serif, system-ui' as const, maxWidth: '100%' },
  thread: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    minHeight: 240,
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: 12,
    background: '#fafafa',
  },
  bubble: (role: string) => ({
    alignSelf: role === 'user' ? ('flex-end' as const) : ('flex-start' as const),
    background: role === 'user' ? '#2266cc' : 'white',
    color: role === 'user' ? 'white' : '#222',
    padding: '8px 12px',
    borderRadius: 12,
    maxWidth: '80%',
    whiteSpace: 'pre-wrap' as const,
    border: role === 'user' ? 'none' : '1px solid #ddd',
  }),
  toolBubble: {
    alignSelf: 'flex-start' as const,
    background: '#eef6ff',
    color: '#555',
    padding: '6px 10px',
    fontFamily: 'ui-monospace, monospace',
    fontSize: 12,
    borderRadius: 8,
  },
  composer: {
    marginTop: 12,
    border: '1px solid #ccc',
    borderRadius: 8,
    padding: 8,
    background: 'white',
  },
};

function renderBlocks(msg: ChatMessage): React.ReactNode {
  return msg.content.map((b, i) => {
    if (b.type === 'text') return <span key={i}>{b.text}</span>;
    if (b.type === 'image') {
      const src = b.source.kind === 'url' ? b.source.data : `data:${b.source.mediaType ?? 'image/png'};base64,${b.source.data}`;
      return <img key={i} src={src} alt="" style={{ display: 'block', maxWidth: 200, marginTop: 4, borderRadius: 6 }} />;
    }
    if (b.type === 'tool_call') {
      return (
        <div key={i} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, opacity: 0.7 }}>
          → calling {b.name}({JSON.stringify(b.arguments)})
        </div>
      );
    }
    return null;
  });
}

// ─── Stories ────────────────────────────────────────────────────────────────

function BasicDemo({ stream = true }: { stream?: boolean }) {
  return (
    <div style={sharedStyles.panel}>
      <SmartChat system="You are a helpful assistant." stream={stream}>
        {({ messages, send, status, stop }) => (
          <>
            <div style={sharedStyles.thread}>
              {messages.length === 0 && <span style={{ color: '#888' }}>Say something to start the chat.</span>}
              {messages.map((m) =>
                m.role === 'tool' ? (
                  <div key={m.id} style={sharedStyles.toolBubble}>
                    tool result: {JSON.stringify((m.content[0] as { result: unknown }).result)}
                  </div>
                ) : (
                  <div key={m.id} style={sharedStyles.bubble(m.role)}>{renderBlocks(m)}</div>
                ),
              )}
            </div>
            <div style={sharedStyles.composer}>
              <SmartChatComposer onSend={send} disabled={status === 'streaming' || status === 'submitted'} />
              {status === 'streaming' && (
                <button type="button" onClick={stop} style={{ marginTop: 6 }}>
                  Stop
                </button>
              )}
            </div>
          </>
        )}
      </SmartChat>
    </div>
  );
}

function ToolsDemo() {
  const weatherTool: SmartTool = useMemo(
    () => ({
      name: 'get_weather',
      description: 'Get the current weather for a city.',
      parameters: {
        type: 'object',
        properties: { city: { type: 'string' } },
        required: ['city'],
      },
      execute: async ({ city }: { city: string }) => {
        await new Promise((r) => setTimeout(r, 400));
        return { city, temp: 72, conditions: 'sunny' };
      },
    }),
    [],
  );

  return (
    <div style={sharedStyles.panel}>
      <p style={{ marginTop: 0, color: '#555' }}>
        Try: <em>“what is the weather in Paris?”</em> — the assistant calls the tool, the hook
        auto-runs <code>execute</code>, the result is fed back, and a final reply streams.
      </p>
      <SmartChat tools={[weatherTool]} system="Help the user with weather queries.">
        {({ messages, send, status }) => (
          <>
            <div style={sharedStyles.thread}>
              {messages.map((m) =>
                m.role === 'tool' ? (
                  <div key={m.id} style={sharedStyles.toolBubble}>
                    tool result: {JSON.stringify((m.content[0] as { result: unknown }).result)}
                  </div>
                ) : (
                  <div key={m.id} style={sharedStyles.bubble(m.role)}>{renderBlocks(m)}</div>
                ),
              )}
            </div>
            <div style={sharedStyles.composer}>
              <SmartChatComposer onSend={send} disabled={status !== 'idle' && status !== 'ready'} />
            </div>
          </>
        )}
      </SmartChat>
    </div>
  );
}

function VisionDemo() {
  return (
    <div style={sharedStyles.panel}>
      <p style={{ marginTop: 0, color: '#555' }}>
        Attach an image with the 📎 button or paste a data URL. The mock client acknowledges
        any image in the user message.
      </p>
      <SmartChat system="Describe any images the user attaches.">
        {({ messages, send, status }) => (
          <>
            <div style={sharedStyles.thread}>
              {messages.map((m) => (
                <div key={m.id} style={sharedStyles.bubble(m.role)}>{renderBlocks(m)}</div>
              ))}
            </div>
            <div style={sharedStyles.composer}>
              <SmartChatComposer
                onSend={send}
                disabled={status === 'streaming' || status === 'submitted'}
                enableImageUpload
              />
            </div>
          </>
        )}
      </SmartChat>
    </div>
  );
}

function ControlledDemo() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  return (
    <div style={sharedStyles.panel}>
      <p style={{ marginTop: 0, color: '#555' }}>
        Messages live in the parent component (controlled mode). Persist to localStorage,
        sync to a server, etc.
      </p>
      <SmartChat messages={messages} onMessagesChange={setMessages}>
        {({ send, status, reset }) => (
          <>
            <div style={sharedStyles.thread}>
              {messages.map((m) => (
                <div key={m.id} style={sharedStyles.bubble(m.role)}>{renderBlocks(m)}</div>
              ))}
            </div>
            <div style={sharedStyles.composer}>
              <SmartChatComposer onSend={send} disabled={status === 'streaming' || status === 'submitted'} />
              <button type="button" onClick={reset} style={{ marginTop: 6 }}>Clear</button>
            </div>
          </>
        )}
      </SmartChat>
    </div>
  );
}

const meta: Meta<typeof BasicDemo> = {
  title: 'Components/SmartChat',
  component: BasicDemo,
  decorators: [
    (Story) => (
      <SmartProvider client={buildStreamingClient()}>
        <Story />
      </SmartProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof BasicDemo>;

export const Streaming: Story = { args: { stream: true } };
export const NonStreaming: Story = { args: { stream: false } };
export const WithTools: StoryObj<typeof ToolsDemo> = {
  render: () => <ToolsDemo />,
};
export const Vision: StoryObj<typeof VisionDemo> = {
  render: () => <VisionDemo />,
};
export const Controlled: StoryObj<typeof ControlledDemo> = {
  render: () => <ControlledDemo />,
};
export const Mobile: Story = {
  args: { stream: true },
  parameters: { viewport: { defaultViewport: 'iphone6' } },
};
