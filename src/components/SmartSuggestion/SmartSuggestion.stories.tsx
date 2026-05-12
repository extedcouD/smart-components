import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SmartProvider } from '../../provider/SmartProvider';
import { createMockClient } from '../../adapters/mock';
import { SmartSuggestion } from './SmartSuggestion';

const mockClient = createMockClient({
  latencyMs: 400,
  complete: ({ prompt }) => {
    const seed = prompt.trim().toLowerCase();
    if (!seed) return JSON.stringify([]);
    const ideas = [
      `${seed} pro`,
      `${seed} studio`,
      `${seed} cloud`,
      `${seed} lite`,
      `${seed} ai`,
    ];
    return JSON.stringify(ideas);
  },
});

function ControlledSuggestion(props: { context?: string }) {
  const [v, setV] = useState('');
  return (
    <div style={{ font: '14px monospace' }}>
      <SmartSuggestion
        value={v}
        onChange={setV}
        onSelect={(s) => console.log('selected', s)}
        context={props.context}
        debounceMs={250}
        minChars={1}
        placeholder="Type a project name…"
        style={{ width: 360, padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
        listClassName="sb-list"
        itemClassName="sb-item"
      />
      <style>{`
        .sb-list { background: #fff; border: 1px solid #e5e5e5; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-top: 4px; }
        .sb-item { padding: 8px 12px; }
        .sb-item[aria-selected="true"] { background: #eef; }
      `}</style>
      <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>value: {JSON.stringify(v)}</div>
    </div>
  );
}

const meta: Meta<typeof ControlledSuggestion> = {
  title: 'Components/SmartSuggestion',
  component: ControlledSuggestion,
  decorators: [
    (Story) => (
      <SmartProvider client={mockClient}>
        <Story />
      </SmartProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ControlledSuggestion>;

export const Default: Story = { args: {} };
export const WithContext: Story = { args: { context: 'naming a SaaS product for finance teams' } };
