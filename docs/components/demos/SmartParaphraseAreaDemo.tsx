'use client';
import { useState } from 'react';
import { SmartProvider, SmartParaphraseArea } from '@extedcoud/smart-components';
import { makeRewriteMock } from '@/lib/mock-client';

const client = makeRewriteMock();

export default function SmartParaphraseAreaDemo() {
  const [value, setValue] = useState(
    'thx for getting back to me, lemme check on this and circle back tmrw',
  );
  return (
    <SmartProvider client={client}>
      <div className="w-full max-w-xl">
        <SmartParaphraseArea
          value={value}
          onChange={setValue}
          autoResize
          rows={3}
          instruction="Rewrite this text in a polished, professional tone. Keep the same meaning."
          className="w-full resize-none rounded-md border border-fd-border bg-fd-background px-3 py-2 text-base text-fd-foreground outline-none focus:border-fd-foreground"
        />
      </div>
    </SmartProvider>
  );
}
