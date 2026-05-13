'use client';
import { useState } from 'react';
import { SmartProvider, SmartRewrite } from '@extedcoud/smart-components';
import { makeRewriteMock } from '@/lib/mock-client';

const client = makeRewriteMock();

const PRESET_ICONS: Record<string, string> = {
  Shorter: '✂️',
  Formal: '🎩',
  Casual: '🛋️',
  'Fix grammar': '📝',
};

export default function SmartRewriteStylized() {
  const [value, setValue] = useState(
    'thx for getting back to me, lemme check on this and circle back tmrw',
  );
  return (
    <SmartProvider client={client}>
      <div className="w-full max-w-xl">
        <div className="rounded-2xl border border-fd-border bg-fd-card p-1 shadow-sm">
          <SmartRewrite value={value} onChange={setValue}>
            {({ presets, run, status, rewrite, accept, reject }) => {
              const loading = status === 'loading';
              const ready = status === 'ready';
              const displayed = loading || ready ? rewrite || value : value;
              return (
                <>
                  <div className="relative">
                    <textarea
                      value={displayed}
                      onChange={(e) => setValue(e.target.value)}
                      readOnly={loading || ready}
                      rows={3}
                      style={{ fontSize: 16 }}
                      className={`w-full resize-none rounded-xl bg-transparent px-4 py-3 text-base text-fd-foreground outline-none transition ${
                        ready
                          ? 'bg-gradient-to-br from-emerald-500/5 to-teal-500/5'
                          : loading
                          ? 'animate-pulse'
                          : ''
                      }`}
                    />
                    {ready && (
                      <span className="absolute right-3 top-3 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        ✦ Rewritten
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t border-fd-border p-2">
                    {!ready &&
                      presets.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          disabled={loading}
                          onClick={() => run(p.instruction)}
                          className="inline-flex h-9 min-h-[44px] items-center gap-1.5 rounded-full border border-fd-border bg-fd-background px-3 text-xs font-medium text-fd-foreground transition hover:border-fd-foreground hover:bg-fd-accent disabled:opacity-50"
                          style={{ touchAction: 'manipulation' }}
                        >
                          <span aria-hidden>{PRESET_ICONS[p.label] ?? '✦'}</span>
                          {p.label}
                        </button>
                      ))}
                    {loading && (
                      <span className="inline-flex items-center gap-2 text-xs text-fd-muted-foreground">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-fd-muted-foreground/30 border-t-fd-foreground" />
                        Rewriting…
                      </span>
                    )}
                    {ready && (
                      <>
                        <button
                          type="button"
                          onClick={accept}
                          className="inline-flex h-9 min-h-[44px] items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-semibold text-white shadow transition hover:bg-emerald-500"
                          style={{ touchAction: 'manipulation' }}
                        >
                          ✓ Accept
                        </button>
                        <button
                          type="button"
                          onClick={reject}
                          className="inline-flex h-9 min-h-[44px] items-center gap-1.5 rounded-full border border-fd-border bg-fd-background px-4 text-xs font-medium text-fd-foreground transition hover:bg-fd-accent"
                          style={{ touchAction: 'manipulation' }}
                        >
                          ✕ Reject
                        </button>
                      </>
                    )}
                  </div>
                </>
              );
            }}
          </SmartRewrite>
        </div>
      </div>
    </SmartProvider>
  );
}
