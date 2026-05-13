'use client';
import { useState } from 'react';
import { SmartProvider, useSmartState } from '@extedcoud/smart-components';
import { makeSmartStateMock } from '@/lib/mock-client';

const client = makeSmartStateMock(450);

const SAMPLE = `Meeting notes — 2026-05-13
Discussed the Q3 budget revision with finance. Need to circulate the updated forecast by Friday. Maya will own the slide deck; Jordan to finalize headcount numbers. Sign-off from VP Eng required before submission. Tight timeline — this is blocking the Q3 OKRs review.`;

function Demo() {
  const [text, setText] = useState(SAMPLE);
  const [out, , ai] = useSmartState(
    { summary: '', actionItems: [''], urgency: '', dueDate: '' },
    'Structured fields extracted from raw text',
  );
  const items = out.actionItems.filter(Boolean);
  return (
    <div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} />
      <button onClick={() => ai.generate(text)} disabled={ai.status === 'loading'}>
        {ai.status === 'loading' ? 'Extracting…' : 'Extract'}
      </button>
      <p><strong>Summary</strong>: {out.summary || '—'}</p>
      <p><strong>Action items</strong>:</p>
      <ul>{items.map((a, i) => <li key={i}>{a}</li>)}</ul>
      <p><strong>Urgency</strong>: {out.urgency || '—'}</p>
      <p><strong>Due</strong>: {out.dueDate || '—'}</p>
    </div>
  );
}

export default function SmartStateExtractSkeleton() {
  return (
    <SmartProvider client={client}>
      <Demo />
    </SmartProvider>
  );
}
