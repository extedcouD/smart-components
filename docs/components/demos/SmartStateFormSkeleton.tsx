'use client';
import { useState } from 'react';
import { SmartProvider, useSmartState } from '@extedcoud/smart-components';
import { makeSmartStateMock } from '@/lib/mock-client';

const client = makeSmartStateMock(400);

function Demo() {
  const [brief, setBrief] = useState('lunch with Sarah tomorrow at noon at Olive Garden');
  const [event, , ai] = useSmartState(
    { title: '', attendees: [''], datetimeISO: '', location: '', notes: '' },
    'A calendar event extracted from a one-line brief',
  );
  return (
    <div>
      <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={2} />
      <button onClick={() => ai.generate(brief)} disabled={ai.status === 'loading'}>
        {ai.status === 'loading' ? 'Filling…' : 'Fill form'}
      </button>
      <dl>
        <dt>Title</dt><dd>{event.title || '—'}</dd>
        <dt>Attendees</dt><dd>{event.attendees.filter(Boolean).join(', ') || '—'}</dd>
        <dt>When</dt><dd>{event.datetimeISO || '—'}</dd>
        <dt>Where</dt><dd>{event.location || '—'}</dd>
        <dt>Notes</dt><dd>{event.notes || '—'}</dd>
      </dl>
    </div>
  );
}

export default function SmartStateFormSkeleton() {
  return (
    <SmartProvider client={client}>
      <Demo />
    </SmartProvider>
  );
}
