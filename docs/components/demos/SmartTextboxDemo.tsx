'use client';
import { useState } from 'react';
import { SmartProvider, SmartTextbox } from '@extedcoud/smart-components';
import { makeGhostMock } from '@/lib/mock-client';

const client = makeGhostMock();

export default function SmartTextboxDemo() {
  const [value, setValue] = useState('');
  return (
    <SmartProvider client={client}>
      <div className="w-full max-w-md">
        <SmartTextbox
          value={value}
          onChange={setValue}
          placeholder="Type Hello, Dear, or Thanks…"
          context="user is writing a support reply"
          className="w-full rounded-md border border-fd-border bg-fd-background px-3 py-2 text-base text-fd-foreground outline-none focus:border-fd-foreground"
        />
      </div>
    </SmartProvider>
  );
}
