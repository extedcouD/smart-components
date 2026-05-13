'use client';
import { useState } from 'react';
import { SmartProvider, useSmartState } from '@extedcoud/smart-components';
import { makeSmartStateMock } from '@/lib/mock-client';

const client = makeSmartStateMock(500);

const PRESETS = [
  'lunch with Sarah tomorrow at noon at Olive Garden',
  'project kickoff sync next Monday 10am on Zoom',
  'onsite interview with senior engineer candidate',
];

function formatWhen(iso: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function Demo() {
  const [brief, setBrief] = useState(PRESETS[0]);
  const [event, , ai] = useSmartState(
    { title: '', attendees: [''], datetimeISO: '', location: '', notes: '' },
    'A calendar event extracted from a one-line brief',
  );
  const loading = ai.status === 'loading';
  const filled = !!event.title;

  return (
    <div className="w-full max-w-xl">
      <div className="rounded-2xl border border-fd-border bg-fd-card p-5 shadow-sm">
        <label
          htmlFor="smart-state-brief"
          className="block text-xs font-medium uppercase tracking-wider text-fd-muted-foreground"
        >
          One-line brief
        </label>
        <textarea
          id="smart-state-brief"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={2}
          style={{ fontSize: 16 }}
          className="mt-2 w-full resize-none rounded-lg border border-fd-border bg-fd-background px-3 py-2 text-base text-fd-foreground outline-none transition focus:border-fd-foreground"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setBrief(p)}
              className="inline-flex items-center rounded-full border border-fd-border bg-fd-background px-3 py-1 text-[11px] text-fd-muted-foreground transition hover:bg-fd-accent"
              style={{ touchAction: 'manipulation' }}
            >
              {p.length > 40 ? p.slice(0, 40) + '…' : p}
            </button>
          ))}
        </div>
        <button
          onClick={() => ai.generate(brief)}
          disabled={loading || !brief.trim()}
          className="mt-3 inline-flex h-10 min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-50"
          style={{ touchAction: 'manipulation' }}
        >
          {loading ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Filling…
            </>
          ) : (
            <>✦ Fill the form</>
          )}
        </button>

        <div className="mt-5 rounded-xl border border-fd-border bg-fd-background">
          <div className="grid grid-cols-[88px_1fr] gap-y-3 px-4 py-4 text-sm">
            <div className="text-xs uppercase tracking-wider text-fd-muted-foreground">Title</div>
            <div className={`font-medium text-fd-foreground ${loading ? 'animate-pulse' : ''}`}>
              {filled ? event.title : <span className="text-fd-muted-foreground">—</span>}
            </div>

            <div className="text-xs uppercase tracking-wider text-fd-muted-foreground">When</div>
            <div className={`text-fd-foreground ${loading ? 'animate-pulse' : ''}`}>
              {filled ? formatWhen(event.datetimeISO) : <span className="text-fd-muted-foreground">—</span>}
            </div>

            <div className="text-xs uppercase tracking-wider text-fd-muted-foreground">Where</div>
            <div className={`text-fd-foreground ${loading ? 'animate-pulse' : ''}`}>
              {filled ? event.location : <span className="text-fd-muted-foreground">—</span>}
            </div>

            <div className="text-xs uppercase tracking-wider text-fd-muted-foreground">Attendees</div>
            <div className={`flex flex-wrap gap-1 ${loading ? 'animate-pulse' : ''}`}>
              {filled ? (
                event.attendees.filter(Boolean).map((a, i) => (
                  <span
                    key={`${a}-${i}`}
                    className="inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300"
                  >
                    {a}
                  </span>
                ))
              ) : (
                <span className="text-fd-muted-foreground">—</span>
              )}
            </div>

            <div className="text-xs uppercase tracking-wider text-fd-muted-foreground">Notes</div>
            <div className={`text-sm text-fd-muted-foreground ${loading ? 'animate-pulse' : ''}`}>
              {filled ? event.notes : '—'}
            </div>
          </div>
        </div>
        {ai.error && <p className="mt-3 text-xs text-red-500">{ai.error.message}</p>}
      </div>
    </div>
  );
}

export default function SmartStateFormStylized() {
  return (
    <SmartProvider client={client}>
      <Demo />
    </SmartProvider>
  );
}
