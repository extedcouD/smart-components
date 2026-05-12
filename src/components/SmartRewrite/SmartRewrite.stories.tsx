import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import { SmartProvider } from '../../provider/SmartProvider';
import { createMockClient } from '../../adapters/mock';
import { SmartRewrite } from './SmartRewrite';

const mockClient = createMockClient({
  latencyMs: 400,
  complete: ({ prompt }) => {
    if (/Instruction: .*shorter/i.test(prompt)) return 'Shorter version of the text.';
    if (/Instruction: .*formal/i.test(prompt))
      return 'A more polished, formal restatement of the original message.';
    if (/Instruction: .*casual/i.test(prompt)) return 'Hey — here\'s the same idea, but chill.';
    if (/Instruction: .*grammar/i.test(prompt))
      return 'Here is the cleaned-up version with proper grammar.';
    return 'A clearer, improved version of the original.';
  },
  stream: async function* ({ prompt }) {
    const out = /shorter/i.test(prompt)
      ? 'A shorter version.'
      : 'A streamed rewrite that arrives chunk by chunk.';
    for (const ch of out) {
      await new Promise((r) => setTimeout(r, 18));
      yield ch;
    }
  },
});

function naiveWordDiff(a: string, b: string) {
  const aw = a.split(/\s+/);
  const bw = b.split(/\s+/);
  const set = new Set(aw);
  return bw.map((w, i) => (
    <span
      key={i}
      style={{
        background: set.has(w) ? 'transparent' : '#fff3a8',
        marginRight: 4,
      }}
    >
      {w}
    </span>
  ));
}

function Demo({ stream = false, withDiff = false }: { stream?: boolean; withDiff?: boolean }) {
  const [v, setV] = useState(
    'we need to make sure the deploy goes smoothly tonight and that everyone is on standby.',
  );
  const styles = useMemo(
    () => ({
      panel: { width: 600, font: '14px ui-sans-serif, system-ui' as const },
      textarea: {
        width: '100%',
        minHeight: 90,
        padding: 10,
        border: '1px solid #ccc',
        borderRadius: 6,
      },
      row: { display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' as const },
      preview: {
        marginTop: 12,
        padding: 10,
        border: '1px dashed #888',
        borderRadius: 6,
        background: '#fafafa',
        whiteSpace: 'pre-wrap' as const,
        minHeight: 40,
      },
      btn: {
        padding: '4px 10px',
        border: '1px solid #ccc',
        background: 'white',
        borderRadius: 4,
        cursor: 'pointer',
      },
      primary: {
        padding: '4px 10px',
        border: '1px solid #2266cc',
        background: '#2266cc',
        color: 'white',
        borderRadius: 4,
        cursor: 'pointer',
      },
    }),
    [],
  );

  return (
    <div style={styles.panel}>
      <textarea value={v} onChange={(e) => setV(e.target.value)} style={styles.textarea} />
      <SmartRewrite value={v} onChange={setV} stream={stream}>
        {({ rewrite, status, error, run, accept, reject, presets }) => (
          <div>
            <div style={styles.row}>
              {presets.map((p) => (
                <button
                  key={p.label}
                  style={styles.btn}
                  onClick={() => run(p.instruction)}
                  disabled={status === 'loading'}
                >
                  {p.label}
                </button>
              ))}
              <button style={styles.btn} onClick={() => run()} disabled={status === 'loading'}>
                Default rewrite
              </button>
            </div>
            <div style={styles.preview}>
              {status === 'idle' && <span style={{ color: '#888' }}>No rewrite yet.</span>}
              {status === 'loading' && !rewrite && <span style={{ color: '#888' }}>Rewriting…</span>}
              {status === 'error' && <span style={{ color: 'crimson' }}>Error: {error?.message}</span>}
              {rewrite && (withDiff ? <div>{naiveWordDiff(v, rewrite)}</div> : rewrite)}
            </div>
            {status === 'ready' && (
              <div style={styles.row}>
                <button style={styles.primary} onClick={accept}>
                  Accept
                </button>
                <button style={styles.btn} onClick={reject}>
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </SmartRewrite>
    </div>
  );
}

const meta: Meta<typeof Demo> = {
  title: 'Components/SmartRewrite',
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
export const Streaming: Story = { args: { stream: true } };
export const WithDiff: Story = { args: { withDiff: true } };
