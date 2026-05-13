'use client';
import { useState } from 'react';
import { SmartProvider, SmartParaphraseArea } from '@extedcoud/smart-components';
import { makeRewriteMock } from '@/lib/mock-client';

const client = makeRewriteMock();

export default function SmartParaphraseAreaStylized() {
  const [value, setValue] = useState(
    'thx for getting back to me, lemme check on this and circle back tmrw',
  );
  return (
    <SmartProvider client={client}>
      <div className="w-full max-w-xl">
        <div className="overflow-hidden rounded-2xl border border-fd-border bg-fd-card shadow-sm">
          <div className="flex items-center justify-between border-b border-fd-border bg-fd-secondary/40 px-4 py-2 text-xs text-fd-muted-foreground">
            <span className="font-medium">Polish your reply</span>
            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-600 dark:text-violet-300">
              ✦ AI polish
            </span>
          </div>
          <SmartParaphraseArea
            value={value}
            onChange={setValue}
            autoResize
            rows={3}
            instruction="Rewrite this text in a polished, professional tone. Keep the same meaning."
            wrapperClassName="relative block"
            className="w-full resize-none bg-transparent px-4 py-3 pr-14 text-base text-fd-foreground outline-none"
            style={{ fontSize: 16 }}
            buttonClassName="absolute bottom-3 right-3 inline-flex h-11 min-h-[44px] w-11 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-500 text-white shadow-lg shadow-violet-500/30 transition hover:scale-105 disabled:opacity-50"
            buttonAriaLabel="Polish to professional tone"
          />
          <div className="flex items-center justify-between border-t border-fd-border bg-fd-secondary/30 px-4 py-2 text-[11px] text-fd-muted-foreground">
            <span>{value.split(/\s+/).filter(Boolean).length} words</span>
            <span>Auto-accepts when the rewrite is ready.</span>
          </div>
        </div>
      </div>
    </SmartProvider>
  );
}
