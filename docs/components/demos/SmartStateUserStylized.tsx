'use client';
import { SmartProvider, useSmartState } from '@extedcoud/smart-components';
import { makeSmartStateMock } from '@/lib/mock-client';

const client = makeSmartStateMock();

const EMPTY = { name: '', age: 0, bio: '' };

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('') || '??'
  );
}

function Demo() {
  const [user, setUser, ai] = useSmartState(EMPTY, 'a fictitious cyberpunk character');
  const loading = ai.status === 'loading';
  const empty = !user.name;

  return (
    <div className="w-full max-w-md">
      <div className="overflow-hidden rounded-2xl border border-fd-border bg-fd-card shadow-sm">
        <div className="relative h-24 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500">
          <div className="absolute inset-x-0 -bottom-10 flex justify-center">
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-full border-4 border-fd-card bg-fd-background text-xl font-bold text-fd-foreground shadow ${
                loading ? 'animate-pulse' : ''
              }`}
            >
              {empty ? '✦' : initials(user.name)}
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 pt-12 text-center">
          <h3 className="text-lg font-semibold text-fd-foreground">
            {empty ? 'No character yet' : user.name}
          </h3>
          <p className="mt-1 text-xs uppercase tracking-wider text-fd-muted-foreground">
            {empty ? '—' : `Age ${user.age}`}
          </p>
          <p className="mt-3 min-h-[3rem] text-sm leading-relaxed text-fd-muted-foreground">
            {empty ? 'Click generate to summon a new persona.' : user.bio}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              onClick={() => ai.generate()}
              disabled={loading}
              className="inline-flex h-10 min-h-[44px] items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 text-sm font-medium text-white shadow transition hover:opacity-90 disabled:opacity-50"
              style={{ touchAction: 'manipulation' }}
            >
              {loading ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Summoning…
                </>
              ) : (
                <>✦ Generate</>
              )}
            </button>
            <button
              onClick={() => setUser(EMPTY)}
              className="inline-flex h-10 min-h-[44px] items-center rounded-full border border-fd-border bg-fd-background px-4 text-sm font-medium text-fd-foreground transition hover:bg-fd-accent"
              style={{ touchAction: 'manipulation' }}
            >
              Clear
            </button>
          </div>
          {ai.error && (
            <p className="mt-3 text-xs text-red-500">{ai.error.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SmartStateUserStylized() {
  return (
    <SmartProvider client={client}>
      <Demo />
    </SmartProvider>
  );
}
