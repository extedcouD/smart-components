'use client';
import { useState } from 'react';
import { SmartProvider, SmartTextarea } from '@extedcoud/smart-components';
import { makeGhostMock } from '@/lib/mock-client';

const client = makeGhostMock();

export default function SmartTextareaStylized() {
  const [value, setValue] = useState('');
  return (
    <SmartProvider client={client}>
      <div className="w-full max-w-xl">
        <div className="overflow-hidden rounded-2xl border border-fd-border bg-fd-card shadow-sm">
          <div className="flex items-center justify-between border-b border-fd-border bg-fd-secondary/40 px-4 py-2">
            <div className="flex items-center gap-2 text-xs text-fd-muted-foreground">
              <span className="flex h-2 w-2 rounded-full bg-rose-500/80" />
              <span className="flex h-2 w-2 rounded-full bg-amber-500/80" />
              <span className="flex h-2 w-2 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-medium">New message</span>
            </div>
            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-600 dark:text-violet-300">
              ✦ AI assist
            </span>
          </div>
          <div className="px-4 pt-3">
            <div className="grid grid-cols-[60px_1fr] gap-2 text-sm">
              <span className="self-center text-fd-muted-foreground">To</span>
              <span className="self-center text-fd-foreground">team@yourco.com</span>
              <span className="self-center text-fd-muted-foreground">Subject</span>
              <span className="self-center text-fd-foreground">Quick update</span>
            </div>
            <hr className="my-3 border-fd-border" />
            <SmartTextarea
              value={value}
              onChange={setValue}
              placeholder="Hi team, just wanted to say…"
              autoResize
              rows={4}
              className="w-full resize-none bg-transparent text-base text-fd-foreground outline-none"
              style={{ fontSize: 16 }}
              ghostStyle={{ color: '#7c3aed', opacity: 0.55, fontStyle: 'italic' }}
            />
          </div>
          <div className="flex items-center justify-between border-t border-fd-border bg-fd-secondary/30 px-4 py-2 text-xs text-fd-muted-foreground">
            <span>{value.length} chars</span>
            <span className="hidden sm:block">
              <kbd className="rounded bg-fd-card px-1.5 py-0.5 font-mono">→</kbd> to accept ghost
            </span>
          </div>
        </div>
      </div>
    </SmartProvider>
  );
}
