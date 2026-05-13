'use client';
import { useState } from 'react';
import { SmartProvider, SmartSuggestion } from '@extedcoud/smart-components';
import { makeSuggestionMock } from '@/lib/mock-client';

const COMMANDS = [
  'Open recent file',
  'Open settings',
  'Run build',
  'Run tests',
  'Toggle theme',
  'Create new component',
  'Create new hook',
  'Search in workspace',
  'Show keyboard shortcuts',
  'Sign out',
];

const ICONS: Record<string, string> = {
  Open: '📂',
  Run: '⚡',
  Toggle: '🌓',
  Create: '✨',
  Search: '🔍',
  Show: '⌨️',
  Sign: '🚪',
};

function iconFor(label: string) {
  const first = label.split(' ')[0];
  return ICONS[first] ?? '·';
}

const client = makeSuggestionMock(COMMANDS, 180);

export default function SmartSuggestionStylized() {
  const [value, setValue] = useState('');
  return (
    <SmartProvider client={client}>
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-xl shadow-fd-foreground/5">
          <div className="flex items-center gap-2 border-b border-fd-border px-3 py-2 text-fd-muted-foreground">
            <span aria-hidden>⌘</span>
            <SmartSuggestion
              value={value}
              onChange={setValue}
              placeholder="Type a command…"
              wrapperClassName="relative flex-1"
              className="w-full bg-transparent text-base text-fd-foreground outline-none placeholder:text-fd-muted-foreground"
              listClassName="absolute left-0 right-0 top-full z-10 mt-2 max-h-72 overflow-y-auto rounded-lg border border-fd-border bg-fd-card p-1 shadow-xl"
              itemClassName="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-fd-foreground transition aria-selected:bg-gradient-to-r aria-selected:from-indigo-500/15 aria-selected:to-fuchsia-500/15 aria-selected:text-fd-foreground hover:bg-fd-accent cursor-pointer"
              renderItem={(item, { active }) => (
                <>
                  <span className="text-lg" aria-hidden>
                    {iconFor(item)}
                  </span>
                  <span className="flex-1">{item}</span>
                  {active && (
                    <kbd className="rounded border border-fd-border bg-fd-background px-1.5 py-0.5 text-[10px] font-mono text-fd-muted-foreground">
                      ↵
                    </kbd>
                  )}
                </>
              )}
            />
            <kbd className="hidden rounded border border-fd-border bg-fd-background px-1.5 py-0.5 text-[10px] font-mono text-fd-muted-foreground sm:block">
              ⌘ K
            </kbd>
          </div>
          <div className="flex items-center justify-between bg-fd-secondary/30 px-3 py-1.5 text-[11px] text-fd-muted-foreground">
            <span>↑↓ to navigate · ↵ to select · esc to dismiss</span>
            <span>{COMMANDS.length} actions</span>
          </div>
        </div>
      </div>
    </SmartProvider>
  );
}
