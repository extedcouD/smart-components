'use client';
import { useState } from 'react';
import { SmartProvider, SmartParaphraseBox } from '@extedcoud/smart-components';
import { makeRewriteMock } from '@/lib/mock-client';

const client = makeRewriteMock();

export default function SmartParaphraseBoxDemo() {
  const [value, setValue] = useState('lemme know if you need anything else');
  return (
    <SmartProvider client={client}>
      <div className="w-full max-w-md">
        <SmartParaphraseBox
          value={value}
          onChange={setValue}
          instruction="Rewrite this text in a polished, professional tone. Keep the same meaning."
          className="w-full rounded-md border border-fd-border bg-fd-background px-3 py-2 text-base text-fd-foreground outline-none focus:border-fd-foreground"
        />
        <p className="mt-2 text-xs text-fd-muted-foreground">
          Tap the sparkle button to rewrite.
        </p>
      </div>
    </SmartProvider>
  );
}
