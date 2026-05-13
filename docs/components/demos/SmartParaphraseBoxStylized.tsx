'use client';
import { useState } from 'react';
import { SmartProvider, SmartParaphraseBox } from '@extedcoud/smart-components';
import { makeRewriteMock } from '@/lib/mock-client';

const client = makeRewriteMock();

export default function SmartParaphraseBoxStylized() {
  const [value, setValue] = useState('lemme know if you need anything else');
  return (
    <SmartProvider client={client}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 p-[1.5px] shadow-lg shadow-violet-500/15">
          <div className="rounded-[14px] bg-fd-card">
            <SmartParaphraseBox
              value={value}
              onChange={setValue}
              instruction="Rewrite this text in a polished, professional tone. Keep the same meaning."
              wrapperClassName="flex items-center gap-2 px-3 py-2"
              className="flex-1 bg-transparent text-base text-fd-foreground outline-none placeholder:text-fd-muted-foreground"
              buttonClassName="inline-flex h-9 min-h-[44px] w-9 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-500 text-white shadow transition hover:scale-105 disabled:opacity-50"
              buttonAriaLabel="Polish text"
            />
          </div>
        </div>
        <p className="mt-2 px-1 text-xs text-fd-muted-foreground">
          Tap ✦ to polish to a professional tone.
        </p>
      </div>
    </SmartProvider>
  );
}
