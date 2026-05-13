'use client';
import { useState } from 'react';
import { SmartProvider, SmartRewrite } from '@extedcoud/smart-components';
import { makeRewriteMock } from '@/lib/mock-client';

const client = makeRewriteMock();

export default function SmartRewriteDemo() {
  const [value, setValue] = useState(
    'thx for getting back to me, lemme check on this and circle back tmrw',
  );
  return (
    <SmartProvider client={client}>
      <div className="w-full max-w-xl space-y-3">
        <SmartRewrite value={value} onChange={setValue}>
          {({ presets, run, status, rewrite, accept, reject }) => (
            <>
              <textarea
                value={status === 'loading' || status === 'ready' ? rewrite || value : value}
                onChange={(e) => setValue(e.target.value)}
                readOnly={status === 'loading' || status === 'ready'}
                rows={3}
                className="w-full resize-none rounded-md border border-fd-border bg-fd-background px-3 py-2 text-base text-fd-foreground outline-none focus:border-fd-foreground"
              />
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    disabled={status === 'loading'}
                    onClick={() => run(p.instruction)}
                    className="inline-flex h-9 items-center rounded-md border border-fd-border bg-fd-card px-3 text-sm font-medium text-fd-foreground transition hover:bg-fd-accent disabled:opacity-50"
                  >
                    {p.label}
                  </button>
                ))}
                {status === 'ready' && (
                  <>
                    <button
                      type="button"
                      onClick={accept}
                      className="inline-flex h-9 items-center rounded-md bg-emerald-600 px-3 text-sm font-medium text-white transition hover:bg-emerald-500"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={reject}
                      className="inline-flex h-9 items-center rounded-md border border-fd-border bg-fd-card px-3 text-sm font-medium text-fd-foreground transition hover:bg-fd-accent"
                    >
                      Reject
                    </button>
                  </>
                )}
                {status === 'loading' && (
                  <span className="self-center text-xs text-fd-muted-foreground">
                    rewriting…
                  </span>
                )}
              </div>
            </>
          )}
        </SmartRewrite>
      </div>
    </SmartProvider>
  );
}
