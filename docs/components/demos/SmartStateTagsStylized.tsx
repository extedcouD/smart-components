'use client';
import { useState } from 'react';
import { SmartProvider, useSmartState } from '@extedcoud/smart-components';
import { makeSmartStateMock } from '@/lib/mock-client';

const client = makeSmartStateMock();

const CATEGORIES = [
  { key: 'scifi', label: '🛸 Sci-fi blog post', context: 'tags for a sci-fi blog post' },
  { key: 'recipe', label: '🍳 Weeknight recipe', context: 'tags for a weeknight recipe post' },
  { key: 'travel', label: '🌍 Travel guide', context: 'tags for a travel guide article' },
] as const;

function Demo() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(CATEGORIES[0]);
  const [tags, , ai] = useSmartState<string[]>([], category.context, {
    shape: { type: 'array', item: 'string' },
  });
  const loading = ai.status === 'loading';

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-fd-border bg-fd-card p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = c.key === category.key;
            return (
              <button
                key={c.key}
                onClick={() => setCategory(c)}
                className={`inline-flex h-8 min-h-[44px] items-center rounded-full border px-3 text-xs font-medium transition ${
                  active
                    ? 'border-fd-foreground bg-fd-foreground text-fd-background'
                    : 'border-fd-border bg-fd-background text-fd-muted-foreground hover:bg-fd-accent'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 min-h-[5.5rem] rounded-lg border border-dashed border-fd-border bg-fd-background p-3">
          {tags.length === 0 ? (
            <p className="py-3 text-center text-sm text-fd-muted-foreground">
              No tags yet — generate to see suggestions.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((t, i) => (
                <span
                  key={`${t}-${i}`}
                  className={`inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500/15 to-teal-500/15 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300 ${
                    loading ? 'animate-pulse' : ''
                  }`}
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => ai.generate(category.context)}
          disabled={loading}
          className="mt-4 inline-flex h-10 min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-50"
          style={{ touchAction: 'manipulation' }}
        >
          {loading ? 'Generating…' : `Generate ${category.label.split(' ').slice(1).join(' ')} tags`}
        </button>
      </div>
    </div>
  );
}

export default function SmartStateTagsStylized() {
  return (
    <SmartProvider client={client}>
      <Demo />
    </SmartProvider>
  );
}
