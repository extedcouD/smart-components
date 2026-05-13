'use client';
import { useState } from 'react';
import { SmartProvider, SmartTextbox } from '@extedcoud/smart-components';
import { makeGhostMock } from '@/lib/mock-client';

const client = makeGhostMock();

export default function SmartTextboxStylized() {
  const [value, setValue] = useState('');
  return (
    <SmartProvider client={client}>
      <div className="w-full max-w-md">
        <div className="group relative rounded-2xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500 p-[1.5px] shadow-lg shadow-fuchsia-500/10 transition focus-within:shadow-fuchsia-500/30">
          <div className="flex items-center gap-2 rounded-[14px] bg-fd-card px-3">
            <span className="text-fd-muted-foreground" aria-hidden>
              ✦
            </span>
            <SmartTextbox
              value={value}
              onChange={setValue}
              placeholder="Type Hello, Dear, or Thanks…"
              context="user is writing a support reply"
              className="flex-1 bg-transparent py-3 text-base text-fd-foreground outline-none placeholder:text-fd-muted-foreground"
              ghostStyle={{
                color: '#a855f7',
                opacity: 0.7,
                fontStyle: 'italic',
              }}
            />
            <kbd className="hidden rounded-md border border-fd-border bg-fd-background px-1.5 py-0.5 text-[10px] font-mono text-fd-muted-foreground sm:inline">
              →
            </kbd>
          </div>
        </div>
        <p className="mt-2 px-1 text-xs text-fd-muted-foreground">
          Ghost-text in violet italic. Press <kbd className="rounded bg-fd-card px-1 py-0.5 text-[10px]">→</kbd> to accept.
        </p>
      </div>
    </SmartProvider>
  );
}
