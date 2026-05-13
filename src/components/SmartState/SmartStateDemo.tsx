import { useState } from 'react';
import { useSmartState } from '../../hooks/useSmartState';

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
const codeStyle: React.CSSProperties = {
  display: 'block',
  background: '#f1f5f9',
  padding: 8,
  borderRadius: 4,
  marginTop: 8,
  fontFamily: 'ui-monospace, monospace',
  fontSize: 12,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

function RandomNumberPanel() {
  const [n, setN, ai] = useSmartState(0, 'a random integer between 1 and 100');
  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Random number</div>
      <button style={btnStyle} onClick={() => ai.generate()} disabled={ai.status === 'loading'}>
        {ai.status === 'loading' ? 'Generating…' : 'Generate'}
      </button>
      <button style={{ ...btnStyle, background: '#64748b', borderColor: '#64748b' }} onClick={() => setN(0)}>
        Reset
      </button>
      <code style={codeStyle}>n = {n}</code>
    </div>
  );
}

function GeneratedUserPanel() {
  const [user, setUser, ai] = useSmartState(
    { name: '', age: 0, bio: '' },
    'a fictitious cyberpunk character',
  );
  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Generated user</div>
      <button style={btnStyle} onClick={() => ai.generate()} disabled={ai.status === 'loading'}>
        {ai.status === 'loading' ? 'Generating…' : 'Generate'}
      </button>
      <button
        style={{ ...btnStyle, background: '#64748b', borderColor: '#64748b' }}
        onClick={() => setUser({ name: '', age: 0, bio: '' })}
      >
        Reset
      </button>
      <code style={codeStyle}>{JSON.stringify(user, null, 2)}</code>
      {ai.error && <div style={{ color: '#b91c1c', marginTop: 8 }}>{ai.error.message}</div>}
    </div>
  );
}

function GeneratedTagsPanel() {
  const [tags, , ai] = useSmartState([''], 'tags for a sci-fi blog post');
  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Generated tags</div>
      <button style={btnStyle} onClick={() => ai.generate()} disabled={ai.status === 'loading'}>
        {ai.status === 'loading' ? 'Generating…' : 'Generate tags'}
      </button>
      <code style={codeStyle}>{JSON.stringify(tags)}</code>
    </div>
  );
}

function CustomContextPanel() {
  const [user, , ai] = useSmartState({ name: '', age: 0, bio: '' });
  const [prompt, setPrompt] = useState('a brave wizard');
  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Custom prompt → context override</div>
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="describe a character…"
        style={{ width: '100%', padding: 8, marginBottom: 8, fontSize: 16, boxSizing: 'border-box' }}
      />
      <button style={btnStyle} onClick={() => ai.generate(prompt)} disabled={ai.status === 'loading'}>
        {ai.status === 'loading' ? 'Generating…' : 'Generate'}
      </button>
      <code style={codeStyle}>{JSON.stringify(user, null, 2)}</code>
    </div>
  );
}

export function SmartStateDemo() {
  return (
    <div style={{ width: 520, maxWidth: '100%' }}>
      <RandomNumberPanel />
      <GeneratedUserPanel />
      <GeneratedTagsPanel />
      <CustomContextPanel />
    </div>
  );
}
