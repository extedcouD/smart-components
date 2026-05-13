'use client';
import { useState } from 'react';
import { SmartProvider, SmartTextarea } from '@extedcoud/smart-components';
import { makeGhostMock } from '@/lib/mock-client';

const client = makeGhostMock();

export default function SmartTextareaDemo() {
  const [value, setValue] = useState('');
  return (
    <SmartProvider client={client}>
      <div className="w-full max-w-xl">
        <SmartTextarea
          value={value}
          onChange={setValue}
          placeholder="Compose your email…"
          autoResize
          rows={4}
          className="w-full resize-none rounded-md border border-fd-border bg-fd-background px-3 py-2 text-base text-fd-foreground outline-none focus:border-fd-foreground"
        />
      </div>
    </SmartProvider>
  );
}
