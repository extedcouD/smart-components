'use client';
import { useState } from 'react';
import { SmartProvider, useSmartState } from '@extedcoud/smart-components';
import { makeSmartStateMock } from '@/lib/mock-client';

const client = makeSmartStateMock(500);

const SAMPLES = [
  {
    label: 'Q3 budget',
    text: `Meeting notes — 2026-05-13
Discussed the Q3 budget revision with finance. Need to circulate the updated forecast by Friday. Maya will own the slide deck; Jordan to finalize headcount numbers. Sign-off from VP Eng required before submission. Tight timeline — blocking the Q3 OKRs review.`,
  },
  {
    label: 'Migration deploy',
    text: `Deploy review:
Migration ready in staging, awaiting validation. Need a rollback plan documented before we schedule the production window. Estimated 1-week timeline.`,
  },
];

const URGENCY_STYLES: Record<string, string> = {
  high: 'bg-rose-500/15 text-rose-700 ring-rose-500/30 dark:text-rose-300',
  medium: 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300',
  low: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300',
};

function Demo() {
  const [sample, setSample] = useState(SAMPLES[0]);
  const [text, setText] = useState(SAMPLES[0].text);
  const [out, , ai] = useSmartState(
    { summary: '', actionItems: [''], urgency: '', dueDate: '' },
    'Structured fields extracted from raw text',
  );
  const loading = ai.status === 'loading';
  const items = out.actionItems.filter(Boolean);
  const filled = !!out.summary;

  return (
    <div className="w-full max-w-xl">
      <div className="rounded-2xl border border-fd-border bg-fd-card p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {SAMPLES.map((s) => {
            const active = s.label === sample.label;
            return (
              <button
                key={s.label}
                onClick={() => {
                  setSample(s);
                  setText(s.text);
                }}
                className={`inline-flex h-8 min-h-[44px] items-center rounded-full border px-3 text-xs font-medium transition ${
                  active
                    ? 'border-fd-foreground bg-fd-foreground text-fd-background'
                    : 'border-fd-border bg-fd-background text-fd-muted-foreground hover:bg-fd-accent'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <label
          htmlFor="smart-state-extract-text"
          className="mt-4 block text-xs font-medium uppercase tracking-wider text-fd-muted-foreground"
        >
          Raw notes
        </label>
        <textarea
          id="smart-state-extract-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          style={{ fontSize: 14, fontFamily: 'ui-monospace, monospace' }}
          className="mt-2 w-full resize-none rounded-lg border border-fd-border bg-fd-background px-3 py-2 text-fd-foreground outline-none focus:border-fd-foreground"
        />
        <button
          onClick={() => ai.generate(text)}
          disabled={loading || !text.trim()}
          className="mt-3 inline-flex h-10 min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-50"
          style={{ touchAction: 'manipulation' }}
        >
          {loading ? 'Extracting…' : '✦ Extract structured data'}
        </button>

        <div className={`mt-5 rounded-xl border border-fd-border bg-fd-background p-4 transition ${loading ? 'animate-pulse' : ''}`}>
          {!filled ? (
            <p className="py-6 text-center text-sm text-fd-muted-foreground">
              Click extract to pull a summary, action items, urgency and due date.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {out.urgency && (
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ring-1 ${
                      URGENCY_STYLES[out.urgency.toLowerCase()] ?? URGENCY_STYLES.low
                    }`}
                  >
                    {out.urgency} urgency
                  </span>
                )}
                {out.dueDate && (
                  <span className="inline-flex items-center rounded-full bg-fd-secondary/60 px-2.5 py-0.5 text-[11px] font-medium text-fd-foreground">
                    Due {out.dueDate}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-fd-foreground">{out.summary}</p>
              {items.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {items.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-fd-foreground">
                      <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-600 dark:text-violet-300">
                        {i + 1}
                      </span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SmartStateExtractStylized() {
  return (
    <SmartProvider client={client}>
      <Demo />
    </SmartProvider>
  );
}
