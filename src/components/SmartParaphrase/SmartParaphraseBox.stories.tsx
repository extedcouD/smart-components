import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SmartProvider } from '../../provider/SmartProvider';
import { createMockClient } from '../../adapters/mock';
import { SmartParaphraseBox } from './SmartParaphraseBox';

const mockClient = createMockClient({
  latencyMs: 600,
  complete: ({ prompt }) => {
    if (/Instruction: .*french/i.test(prompt)) return 'Une version française du texte.';
    if (/Instruction: .*punchy/i.test(prompt)) return 'Punchy. Direct. Done.';
    if (/Instruction: .*shorter/i.test(prompt)) return 'Shorter version of the text.';
    return 'A clearer, paraphrased version of the original text.';
  },
  stream: async function* () {
    const out = 'A clearer, streamed paraphrase that arrives chunk by chunk.';
    for (const ch of out) {
      await new Promise((r) => setTimeout(r, 20));
      yield ch;
    }
  },
});

const fieldStyle: React.CSSProperties = {
  width: '100%',
  paddingTop: 10,
  paddingBottom: 10,
  paddingLeft: 12,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  font: 'inherit',
};

function Demo(props: {
  context?: string;
  instruction?: string;
  stream?: boolean;
  disableAI?: boolean;
  customIcon?: boolean;
  customButton?: boolean;
}) {
  const [v, setV] = useState('the deployment looks good but we should verify staging tonight.');
  return (
    <div style={{ width: 520, font: '14px system-ui' }}>
      <div style={{ marginBottom: 6, color: '#475569' }}>Paraphrase a single-line input:</div>
      <SmartParaphraseBox
        value={v}
        onChange={setV}
        aria-label="paraphrase-textbox"
        context={props.context}
        instruction={props.instruction}
        stream={props.stream}
        disableAI={props.disableAI}
        icon={props.customIcon ? <span style={{ fontSize: 16 }}>🪄</span> : undefined}
        renderButton={
          props.customButton
            ? ({ onClick, status, disabled }) => (
                <button
                  type="button"
                  onClick={onClick}
                  disabled={disabled}
                  style={{
                    position: 'absolute',
                    right: 6,
                    bottom: 6,
                    padding: '4px 10px',
                    border: '1px solid #2563eb',
                    background: status === 'loading' ? '#dbeafe' : '#2563eb',
                    color: status === 'loading' ? '#1e40af' : 'white',
                    borderRadius: 4,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                  }}
                >
                  {status === 'loading' ? 'Rewriting…' : 'AI'}
                </button>
              )
            : undefined
        }
        style={fieldStyle}
      />
    </div>
  );
}

const meta: Meta<typeof Demo> = {
  title: 'Components/SmartParaphraseBox',
  component: Demo,
  decorators: [
    (Story) => (
      <SmartProvider client={mockClient}>
        <Story />
      </SmartProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Demo>;

export const Default: Story = { args: {} };
export const WithContext: Story = { args: { context: 'release-notes voice' } };
export const CustomInstruction: Story = { args: { instruction: 'Make it punchy' } };
export const TranslateToFrench: Story = { args: { instruction: 'Translate to french' } };
export const CustomIcon: Story = { args: { customIcon: true } };
export const CustomButton: Story = { args: { customButton: true } };
export const Streaming: Story = { args: { stream: true } };
export const DisableAI: Story = { args: { disableAI: true } };
export const Mobile: Story = {
  args: {},
  parameters: { viewport: { defaultViewport: 'iphonese' } },
};
