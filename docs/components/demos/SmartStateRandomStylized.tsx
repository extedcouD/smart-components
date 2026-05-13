'use client';
import { SmartProvider, useSmartState } from '@extedcoud/smart-components';
import { makeSmartStateMock } from '@/lib/mock-client';

const client = makeSmartStateMock();

function Demo() {
  const [n, setN, ai] = useSmartState(0, 'a random integer between 1 and 100');
  const loading = ai.status === 'loading';

  return (
    <div className="w-full max-w-sm">
      <div className="relative overflow-hidden rounded-2xl border border-fd-border bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/10 to-cyan-500/10 p-8 shadow-sm">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
        <p className="relative text-xs font-medium uppercase tracking-[0.18em] text-fd-muted-foreground">
          Lucky number
        </p>
        <div
          className={`relative mt-3 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500 bg-clip-text text-7xl font-bold leading-none tracking-tight text-transparent transition ${
            loading ? 'animate-pulse opacity-60' : ''
          }`}
        >
          {String(n).padStart(2, '0')}
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => ai.generate()}
            disabled={loading}
            className="inline-flex h-10 min-h-[44px] items-center rounded-full bg-fd-foreground px-5 text-sm font-medium text-fd-background shadow transition hover:opacity-90 disabled:opacity-50"
            style={{ touchAction: 'manipulation' }}
          >
            {loading ? 'Rolling…' : 'Roll the dice'}
          </button>
          <button
            onClick={() => setN(0)}
            className="inline-flex h-10 min-h-[44px] items-center rounded-full border border-fd-border bg-fd-background px-5 text-sm font-medium text-fd-foreground transition hover:bg-fd-accent"
            style={{ touchAction: 'manipulation' }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SmartStateRandomStylized() {
  return (
    <SmartProvider client={client}>
      <Demo />
    </SmartProvider>
  );
}
