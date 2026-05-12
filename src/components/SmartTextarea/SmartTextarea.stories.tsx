import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SmartProvider } from '../../provider/SmartProvider';
import { createMockClient } from '../../adapters/mock';
import { SmartTextarea } from './SmartTextarea';

const mockClient = createMockClient({
  latencyMs: 350,
  complete: ({ prompt }) => {
    const tail = prompt.slice(-1);
    if (tail === ' ') return 'and then the next thought continues here.';
    if (tail === '\n') return 'And on the next line, the idea continues.';
    return ', adding a bit more detail to the current sentence.';
  },
  stream: async function* ({ prompt }) {
    const out = prompt.endsWith(' ')
      ? 'and then the next thought continues here.'
      : ', adding a bit more detail.';
    for (const ch of out) {
      await new Promise((r) => setTimeout(r, 18));
      yield ch;
    }
  },
});

function Controlled(props: {
  stream?: boolean;
  context?: string;
  autoResize?: boolean;
  initial?: string;
}) {
  const [v, setV] = useState(props.initial ?? 'Hello world');
  return (
    <div style={{ font: '14px ui-sans-serif, system-ui' }}>
      <SmartTextarea
        value={v}
        onChange={setV}
        context={props.context}
        stream={props.stream}
        autoResize={props.autoResize}
        debounceMs={250}
        minChars={3}
        rows={props.autoResize ? undefined : 6}
        style={{
          width: 520,
          padding: 10,
          border: '1px solid #ccc',
          borderRadius: 6,
          lineHeight: 1.5,
        }}
      />
      <div style={{ marginTop: 12, fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
        value: {JSON.stringify(v)}
      </div>
    </div>
  );
}

function CustomStyledGhostTextarea() {
  const [v, setV] = useState('Hello world');
  return (
    <div style={{ font: '14px ui-sans-serif, system-ui' }}>
      <p style={{ fontSize: 13, color: '#666', marginTop: 0 }}>
        Ghost text recolored via <code>ghostStyle</code> — no <code>renderGhost</code> needed.
      </p>
      <SmartTextarea
        value={v}
        onChange={setV}
        debounceMs={250}
        minChars={3}
        rows={6}
        ghostStyle={{ color: '#0066cc', fontStyle: 'italic', opacity: 0.7 }}
        style={{
          width: 520,
          padding: 10,
          border: '1px solid #ccc',
          borderRadius: 6,
          lineHeight: 1.5,
        }}
      />
      <div style={{ marginTop: 12, fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
        value: {JSON.stringify(v)}
      </div>
    </div>
  );
}

const meta: Meta<typeof Controlled> = {
  title: 'Components/SmartTextarea',
  component: Controlled,
  decorators: [
    (Story) => (
      <SmartProvider client={mockClient}>
        <Story />
      </SmartProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Controlled>;

export const Default: Story = { args: {} };
export const Streaming: Story = { args: { stream: true } };
export const WithContext: Story = {
  args: { context: 'user is drafting a friendly internal memo' },
};
export const AutoResize: Story = { args: { autoResize: true, initial: 'Type to grow…' } };
export const LongPrompt: Story = {
  args: {
    initial:
      'Once upon a time in a faraway kingdom,\nthere lived a curious developer who loved\nbuilding small headless components that ',
  },
};
export const CustomGhostStyling: StoryObj<typeof CustomStyledGhostTextarea> = {
  render: () => <CustomStyledGhostTextarea />,
};
