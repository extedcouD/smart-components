'use client';
import { useState } from 'react';
import { SmartProvider, SmartTextbox } from '@extedcoud/smart-components';
import { makeGhostMock } from '@/lib/mock-client';

const client = makeGhostMock();

export default function HeroDemo() {
  const [value, setValue] = useState('');
  return (
    <SmartProvider client={client}>
      <div className="mx-auto w-full max-w-xl">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-fd-muted-foreground">
          Try typing — press → to accept
        </p>
        <SmartTextbox
          value={value}
          onChange={setValue}
          placeholder="Hello"
          className="w-full rounded-md border border-fd-border bg-fd-background px-4 py-3 text-base text-fd-foreground shadow-sm outline-none transition focus:border-fd-foreground"
        />
        <p className="mt-3 text-xs text-fd-muted-foreground">
          Type <code>Hello</code> or <code>Thanks</code> — ghost text appears after a short debounce.
        </p>
      </div>
    </SmartProvider>
  );
}
