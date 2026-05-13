'use client';
import { useState } from 'react';
import { SmartProvider, useSmartState } from '@extedcoud/smart-components';
import { makeSmartStateMock } from '@/lib/mock-client';

const client = makeSmartStateMock(450);

function Demo() {
  const [mood, setMood] = useState('ocean sunrise');
  const [p, , ai] = useSmartState(
    { primary: '', secondary: '', accent: '', background: '', text: '' },
    'A 5-color hex palette (primary/secondary/accent/background/text)',
  );
  return (
    <div>
      <input value={mood} onChange={(e) => setMood(e.target.value)} />
      <button onClick={() => ai.generate(mood)} disabled={ai.status === 'loading'}>
        {ai.status === 'loading' ? 'Generating…' : 'Generate palette'}
      </button>
      <pre>{JSON.stringify(p, null, 2)}</pre>
    </div>
  );
}

export default function SmartStatePaletteSkeleton() {
  return (
    <SmartProvider client={client}>
      <Demo />
    </SmartProvider>
  );
}
