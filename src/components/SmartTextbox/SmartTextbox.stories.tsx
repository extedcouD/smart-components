import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SmartProvider } from '../../provider/SmartProvider';
import { createMockClient } from '../../adapters/mock';
import { SmartTextbox } from './SmartTextbox';

const mockClient = createMockClient({
  latencyMs: 350,
  complete: ({ prompt }) => {
    if (prompt.endsWith(' ')) return 'world';
    return ', and the rest of the sentence follows here.';
  },
  stream: async function* ({ prompt }) {
    const out = prompt.endsWith(' ') ? 'world' : ', and the rest follows here.';
    for (const ch of out) {
      await new Promise((r) => setTimeout(r, 25));
      yield ch;
    }
  },
});

function ControlledTextbox(props: { stream?: boolean; context?: string }) {
  const [v, setV] = useState('hello');
  return (
    <div style={{ font: '16px ui-sans-serif, system-ui' }}>
      <SmartTextbox
        value={v}
        onChange={setV}
        context={props.context}
        stream={props.stream}
        debounceMs={250}
        minChars={3}
        style={{ width: 480, padding: 8, border: '1px solid #ccc', borderRadius: 4, fontSize: 16 }}
      />
      <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>value: {JSON.stringify(v)}</div>
    </div>
  );
}

function MobileTapAcceptTextbox() {
  const [v, setV] = useState('hello');
  return (
    <div style={{ font: '16px ui-sans-serif, system-ui', maxWidth: 360 }}>
      <p style={{ fontSize: 13, color: '#666', marginTop: 0 }}>
        Type 3+ chars, then <strong>tap the grey suggestion</strong> to accept it. No extra button.
      </p>
      <SmartTextbox
        value={v}
        onChange={setV}
        debounceMs={250}
        minChars={3}
        style={{
          width: '100%',
          padding: 12,
          border: '1px solid #ccc',
          borderRadius: 6,
          fontSize: 16,
          boxSizing: 'border-box',
        }}
      />
      <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>value: {JSON.stringify(v)}</div>
    </div>
  );
}

const meta: Meta<typeof ControlledTextbox> = {
  title: 'Components/SmartTextbox',
  component: ControlledTextbox,
  decorators: [
    (Story) => (
      <SmartProvider client={mockClient}>
        <Story />
      </SmartProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ControlledTextbox>;

export const Default: Story = { args: {} };
export const Streaming: Story = { args: { stream: true } };
export const WithContext: Story = { args: { context: 'user is writing a friendly greeting' } };
export const MobileTapAccept: StoryObj<typeof MobileTapAcceptTextbox> = {
  render: () => <MobileTapAcceptTextbox />,
};
