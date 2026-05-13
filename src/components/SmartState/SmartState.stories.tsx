import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SmartProvider } from '../../provider/SmartProvider';
import { createMockClient } from '../../adapters/mock';
import { useSmartState } from '../../hooks/useSmartState';
import { SmartStateDemo } from './SmartStateDemo';

const panelStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  padding: 12,
  marginBottom: 12,
  font: '14px system-ui',
};
const btnStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid #2563eb',
  background: '#2563eb',
  color: 'white',
  borderRadius: 4,
  cursor: 'pointer',
  marginRight: 8,
  touchAction: 'manipulation',
  minHeight: 44,
};
const wrapStyle: React.CSSProperties = { width: 520, maxWidth: '100%' };
const labelStyle: React.CSSProperties = { color: '#64748b', fontSize: 12 };

const mockClient = createMockClient({
  latencyMs: 400,
  complete: ({ prompt }) => {
    if (/integer between/i.test(prompt)) return String(1 + Math.floor(Math.random() * 100));
    if (/cyberpunk/i.test(prompt))
      return JSON.stringify({
        name: 'Kael-9',
        age: 28,
        bio: 'Neon-soaked netrunner with a soft spot for stray drones.',
      });
    if (/sci-fi blog/i.test(prompt))
      return JSON.stringify(['space', 'ai', 'dystopia', 'retrofuture']);
    if (/wizard/i.test(prompt))
      return JSON.stringify({
        name: 'Eldrin',
        age: 412,
        bio: 'A wandering mage who learned magic from a talking owl.',
      });
    if (/villain/i.test(prompt))
      return JSON.stringify({
        name: 'Lord Override',
        age: 99,
        bio: 'Drove out the kindness from his own server farm.',
      });
    return JSON.stringify({ name: 'Default', age: 0, bio: 'A placeholder.' });
  },
});

const meta: Meta<typeof SmartStateDemo> = {
  title: 'Hooks/useSmartState',
  component: SmartStateDemo,
  decorators: [
    (Story) => (
      <SmartProvider client={mockClient}>
        <Story />
      </SmartProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof SmartStateDemo>;

export const Default: Story = {};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'iphonese' } },
};

const formAutofillMock = createMockClient({
  latencyMs: 400,
  complete: ({ prompt }) => {
    if (/lunch|coffee|dinner/i.test(prompt))
      return JSON.stringify({
        title: 'Lunch with Sarah',
        attendees: ['Sarah Chen', 'You'],
        datetimeISO: '2026-05-14T12:00:00',
        location: 'Olive Garden',
        notes: 'Catch up on Q2 launch; bring the deck.',
      });
    if (/sync|standup|kickoff/i.test(prompt))
      return JSON.stringify({
        title: 'Project kickoff sync',
        attendees: ['Engineering', 'Design', 'PM'],
        datetimeISO: '2026-05-15T10:00:00',
        location: 'Zoom',
        notes: 'Align on scope, owners, milestones for Q3.',
      });
    if (/interview/i.test(prompt))
      return JSON.stringify({
        title: 'Onsite — senior engineer',
        attendees: ['Candidate', 'Hiring Manager', 'Tech Lead'],
        datetimeISO: '2026-05-20T14:00:00',
        location: 'HQ — Room 3B',
        notes: 'Coding round + system design; debrief immediately after.',
      });
    return JSON.stringify({
      title: 'Untitled event',
      attendees: ['You'],
      datetimeISO: '2026-05-14T09:00:00',
      location: 'TBD',
      notes: 'Try: "lunch with Sarah tomorrow at noon at Olive Garden".',
    });
  },
});

function FormAutofillPanel() {
  const [brief, setBrief] = useState('lunch with Sarah tomorrow at noon at Olive Garden');
  const [event, , ai] = useSmartState(
    { title: '', attendees: [''], datetimeISO: '', location: '', notes: '' },
    'A calendar event extracted from a one-line brief',
  );
  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Smart form autofill</div>
      <div style={{ ...labelStyle, marginBottom: 6 }}>
        Type a one-line description → AI fills the typed event form.
      </div>
      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={2}
        style={{ width: '100%', padding: 8, fontSize: 16, boxSizing: 'border-box', marginBottom: 8 }}
      />
      <button style={btnStyle} onClick={() => ai.generate(brief)} disabled={ai.status === 'loading'}>
        {ai.status === 'loading' ? 'Filling…' : 'Fill form'}
      </button>
      <div
        style={{
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: '90px 1fr',
          gap: 6,
          fontSize: 13,
        }}
      >
        <div style={labelStyle}>Title</div>
        <div>{event.title || '—'}</div>
        <div style={labelStyle}>Attendees</div>
        <div>{event.attendees.filter(Boolean).join(', ') || '—'}</div>
        <div style={labelStyle}>When</div>
        <div>{event.datetimeISO || '—'}</div>
        <div style={labelStyle}>Where</div>
        <div>{event.location || '—'}</div>
        <div style={labelStyle}>Notes</div>
        <div>{event.notes || '—'}</div>
      </div>
      {ai.error && <div style={{ color: '#b91c1c', marginTop: 8 }}>{ai.error.message}</div>}
    </div>
  );
}

export const FormAutofill: StoryObj = {
  render: () => (
    <SmartProvider client={formAutofillMock}>
      <div style={wrapStyle}>
        <FormAutofillPanel />
      </div>
    </SmartProvider>
  ),
};

const SAMPLE_NOTE = `Meeting notes — 2026-05-13
Discussed the Q3 budget revision with finance. Need to circulate the updated forecast by Friday. Maya will own the slide deck; Jordan to finalize headcount numbers. Sign-off from VP Eng required before submission. Tight timeline — this is blocking the Q3 OKRs review.`;

const extractMock = createMockClient({
  latencyMs: 400,
  complete: ({ prompt }) => {
    if (/q3 budget|forecast|headcount/i.test(prompt))
      return JSON.stringify({
        summary:
          'Q3 budget revision; updated forecast circulating by Friday, pending VP Eng sign-off.',
        actionItems: [
          'Maya: own updated forecast slide deck',
          'Jordan: finalize headcount numbers',
          'Circulate revised forecast to finance',
          'Get VP Eng sign-off before submission',
        ],
        urgency: 'high',
        dueDate: '2026-05-15',
      });
    if (/migration|deploy|rollout/i.test(prompt))
      return JSON.stringify({
        summary: 'Migration deploy review; gated on staging validation and rollback plan.',
        actionItems: [
          'Validate migration on staging',
          'Document rollback steps',
          'Schedule deploy window',
        ],
        urgency: 'medium',
        dueDate: '2026-05-20',
      });
    return JSON.stringify({
      summary: 'No specific items extracted from the provided text.',
      actionItems: ['Add more detail to the source text and re-extract'],
      urgency: 'low',
      dueDate: '',
    });
  },
});

function ExtractPanel() {
  const [text, setText] = useState(SAMPLE_NOTE);
  const [extracted, , ai] = useSmartState(
    { summary: '', actionItems: [''], urgency: '', dueDate: '' },
    'Structured fields extracted from raw text',
  );
  const items = extracted.actionItems.filter(Boolean);
  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Extract from pasted text</div>
      <div style={{ ...labelStyle, marginBottom: 6 }}>
        Paste a meeting note / email → AI extracts a typed object.
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        style={{
          width: '100%',
          padding: 8,
          fontSize: 14,
          boxSizing: 'border-box',
          marginBottom: 8,
          fontFamily: 'ui-monospace, monospace',
        }}
      />
      <button style={btnStyle} onClick={() => ai.generate(text)} disabled={ai.status === 'loading'}>
        {ai.status === 'loading' ? 'Extracting…' : 'Extract'}
      </button>
      <div style={{ marginTop: 12, fontSize: 13 }}>
        <div style={labelStyle}>Summary</div>
        <div style={{ marginBottom: 8 }}>{extracted.summary || '—'}</div>
        <div style={labelStyle}>Action items</div>
        {items.length > 0 ? (
          <ul style={{ margin: '4px 0 8px 18px', padding: 0 }}>
            {items.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        ) : (
          <div style={{ marginBottom: 8 }}>—</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 4 }}>
          <div style={labelStyle}>Urgency</div>
          <div>{extracted.urgency || '—'}</div>
          <div style={labelStyle}>Due</div>
          <div>{extracted.dueDate || '—'}</div>
        </div>
      </div>
      {ai.error && <div style={{ color: '#b91c1c', marginTop: 8 }}>{ai.error.message}</div>}
    </div>
  );
}

export const ExtractFromText: StoryObj = {
  render: () => (
    <SmartProvider client={extractMock}>
      <div style={wrapStyle}>
        <ExtractPanel />
      </div>
    </SmartProvider>
  ),
};

const PALETTES: Record<
  string,
  { primary: string; secondary: string; accent: string; background: string; text: string }
> = {
  ocean: {
    primary: '#0369a1',
    secondary: '#0ea5e9',
    accent: '#22d3ee',
    background: '#f0f9ff',
    text: '#0c4a6e',
  },
  sunset: {
    primary: '#dc2626',
    secondary: '#f97316',
    accent: '#facc15',
    background: '#fff7ed',
    text: '#7c2d12',
  },
  forest: {
    primary: '#166534',
    secondary: '#65a30d',
    accent: '#a3e635',
    background: '#f7fee7',
    text: '#14532d',
  },
  cyberpunk: {
    primary: '#db2777',
    secondary: '#7c3aed',
    accent: '#22d3ee',
    background: '#0f172a',
    text: '#fafafa',
  },
  neutral: {
    primary: '#475569',
    secondary: '#94a3b8',
    accent: '#0f172a',
    background: '#f8fafc',
    text: '#1e293b',
  },
};

const paletteMock = createMockClient({
  latencyMs: 400,
  complete: ({ prompt }) => {
    const key = (['ocean', 'sunset', 'forest', 'cyberpunk'] as const).find((k) =>
      new RegExp(k, 'i').test(prompt),
    );
    return JSON.stringify(PALETTES[key ?? 'neutral']);
  },
});

function PalettePanel() {
  const [mood, setMood] = useState('ocean sunrise');
  const [palette, , ai] = useSmartState(
    { primary: '', secondary: '', accent: '', background: '', text: '' },
    'A 5-color hex palette (primary/secondary/accent/background/text)',
  );
  const hasColors = palette.primary !== '';
  const roles = ['primary', 'secondary', 'accent', 'background', 'text'] as const;
  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Color palette from brief</div>
      <div style={{ ...labelStyle, marginBottom: 6 }}>
        Try &quot;ocean&quot;, &quot;sunset&quot;, &quot;forest&quot;, &quot;cyberpunk&quot;.
      </div>
      <input
        value={mood}
        onChange={(e) => setMood(e.target.value)}
        placeholder="mood or brand brief…"
        style={{
          width: '100%',
          padding: 8,
          fontSize: 16,
          boxSizing: 'border-box',
          marginBottom: 8,
        }}
      />
      <button style={btnStyle} onClick={() => ai.generate(mood)} disabled={ai.status === 'loading'}>
        {ai.status === 'loading' ? 'Generating…' : 'Generate palette'}
      </button>
      {hasColors && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 8,
            marginTop: 12,
          }}
        >
          {roles.map((role) => (
            <div key={role} style={{ textAlign: 'center' }}>
              <div
                style={{
                  background: palette[role],
                  height: 60,
                  borderRadius: 4,
                  border: '1px solid #cbd5e1',
                }}
              />
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{role}</div>
              <code style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>
                {palette[role]}
              </code>
            </div>
          ))}
        </div>
      )}
      {ai.error && <div style={{ color: '#b91c1c', marginTop: 8 }}>{ai.error.message}</div>}
    </div>
  );
}

export const ColorPalette: StoryObj = {
  render: () => (
    <SmartProvider client={paletteMock}>
      <div style={wrapStyle}>
        <PalettePanel />
      </div>
    </SmartProvider>
  ),
};
