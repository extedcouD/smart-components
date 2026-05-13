'use client';
import { useState } from 'react';
import { SmartProvider, useSmartState } from '@extedcoud/smart-components';
import { makeSmartStateMock } from '@/lib/mock-client';

const client = makeSmartStateMock();

function Demo() {
  const [user, , ai] = useSmartState({ name: '', age: 0, bio: '' });
  const [prompt, setPrompt] = useState('a brave wizard');
  return (
    <div>
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="describe a character…"
      />
      <button
        onClick={() => ai.generate(prompt)}
        disabled={ai.status === 'loading'}
        style={{ marginLeft: 8 }}
      >
        {ai.status === 'loading' ? 'Generating…' : 'Generate'}
      </button>
      <pre style={{ marginTop: 12 }}>{JSON.stringify(user, null, 2)}</pre>
    </div>
  );
}

export default function SmartStateContextSkeleton() {
  return (
    <SmartProvider client={client}>
      <Demo />
    </SmartProvider>
  );
}
