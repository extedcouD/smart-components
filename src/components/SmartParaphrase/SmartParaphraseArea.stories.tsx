import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SmartProvider } from '../../provider/SmartProvider';
import { createMockClient } from '../../adapters/mock';
import { SmartParaphraseArea } from './SmartParaphraseArea';

const mockClient = createMockClient({
  latencyMs: 600,
  complete: ({ prompt }) => {
    if (/Instruction: .*french/i.test(prompt))
      return 'Une version française du texte.\n\nVeuillez confirmer avant la fin de la journée.';
    if (/Instruction: .*punchy/i.test(prompt))
      return 'Deploy goes smoothly. Everyone on standby. Confirm by EOD.';
    if (/Instruction: .*shorter/i.test(prompt))
      return 'Ensure smooth deploy tonight; standby; confirm EOD.';
    return 'A clearer, paraphrased version of the original multi-line text.\n\nPlease confirm by end of day.';
  },
  stream: async function* () {
    const out =
      'A clearer, streamed paraphrase that arrives chunk by chunk across multiple lines.\n\nPlease confirm by EOD.';
    for (const ch of out) {
      await new Promise((r) => setTimeout(r, 18));
      yield ch;
    }
  },
});

const fieldStyle: React.CSSProperties = {
  width: '100%',
  paddingTop: 10,
  paddingLeft: 12,
  minHeight: 110,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  font: 'inherit',
};

function Demo(props: {
  context?: string;
  instruction?: string;
  stream?: boolean;
  disableAI?: boolean;
  autoResize?: boolean;
  customIcon?: boolean;
  customButton?: boolean;
}) {
  const [v, setV] = useState(
    'we need to make sure the deploy goes smoothly tonight and that everyone is on standby.\n\nplease confirm by EOD.',
  );
  return (
    <div style={{ width: 520, font: '14px system-ui' }}>
      <div style={{ marginBottom: 6, color: '#475569' }}>Paraphrase a multi-line input:</div>
      <SmartParaphraseArea
        value={v}
        onChange={setV}
        aria-label="paraphrase-textarea"
        context={props.context}
        instruction={props.instruction}
        stream={props.stream}
        disableAI={props.disableAI}
        autoResize={props.autoResize}
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
        rows={5}
        style={fieldStyle}
      />
    </div>
  );
}

const meta: Meta<typeof Demo> = {
  title: 'Components/SmartParaphraseArea',
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
export const WithContext: Story = { args: { context: 'formal correspondence' } };
export const CustomInstruction: Story = { args: { instruction: 'Make it punchy' } };
export const TranslateToFrench: Story = { args: { instruction: 'Translate to french' } };
export const CustomIcon: Story = { args: { customIcon: true } };
export const CustomButton: Story = { args: { customButton: true } };
export const Streaming: Story = { args: { stream: true } };
export const AutoResize: Story = { args: { autoResize: true } };
export const DisableAI: Story = { args: { disableAI: true } };
export const Mobile: Story = {
  args: {},
  parameters: { viewport: { defaultViewport: 'iphonese' } },
};
