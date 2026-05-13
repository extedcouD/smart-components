'use client';
import { useState } from 'react';
import { SmartProvider, useSmartState } from '@extedcoud/smart-components';
import { makeSmartStateMock } from '@/lib/mock-client';

const client = makeSmartStateMock();

const PRESETS = [
  'a stoic cyberpunk netrunner',
  'a brave wizard from a forgotten realm',
  'a retired space pirate now running a noodle shop',
];

function Demo() {
  const [user, , ai] = useSmartState({ name: '', age: 0, bio: '' });
  const [prompt, setPrompt] = useState(PRESETS[0]);
  const loading = ai.status === 'loading';
  const empty = !user.name;

  return (
    <div className="w-full max-w-lg">
      <div className="rounded-2xl border border-fd-border bg-fd-card p-5 shadow-sm">
        <label htmlFor="smart-state-context-input" className="block text-xs font-medium uppercase tracking-wider text-fd-muted-foreground">
          Describe a character
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="smart-state-context-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="a brave wizard…"
            className="flex-1 rounded-lg border border-fd-border bg-fd-background px-3 py-2 text-base text-fd-foreground outline-none transition focus:border-fd-foreground"
            style={{ fontSize: 16 }}
          />
          <button
            onClick={() => ai.generate(prompt)}
            disabled={loading || !prompt.trim()}
            className="inline-flex h-11 min-h-[44px] items-center gap-2 rounded-lg bg-fd-foreground px-4 text-sm font-medium text-fd-background shadow transition hover:opacity-90 disabled:opacity-50"
            style={{ touchAction: 'manipulation' }}
          >
            {loading ? 'Summoning…' : '✦ Generate'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setPrompt(p)}
              className="inline-flex items-center rounded-full border border-fd-border bg-fd-background px-3 py-1 text-xs text-fd-muted-foreground transition hover:bg-fd-accent"
              style={{ touchAction: 'manipulation' }}
            >
              {p}
            </button>
          ))}
        </div>

        <div
          className={`mt-5 rounded-xl border border-fd-border bg-gradient-to-br from-amber-500/5 to-rose-500/5 p-4 transition ${
            loading ? 'animate-pulse' : ''
          }`}
        >
          {empty ? (
            <p className="py-6 text-center text-sm text-fd-muted-foreground">
              Pick a prompt or type your own, then press Generate.
            </p>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-base font-semibold text-fd-foreground">{user.name}</h4>
                <span className="text-xs uppercase tracking-wider text-fd-muted-foreground">
                  Age {user.age}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">{user.bio}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SmartStateContextStylized() {
  return (
    <SmartProvider client={client}>
      <Demo />
    </SmartProvider>
  );
}
