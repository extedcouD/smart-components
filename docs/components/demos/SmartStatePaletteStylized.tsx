'use client';
import { useState } from 'react';
import { SmartProvider, useSmartState } from '@extedcoud/smart-components';
import { makeSmartStateMock } from '@/lib/mock-client';

const client = makeSmartStateMock(500);

const MOODS = ['ocean sunrise', 'sunset vibes', 'forest cabin', 'cyberpunk neon'];
const ROLES = ['primary', 'secondary', 'accent', 'background', 'text'] as const;

function Demo() {
  const [mood, setMood] = useState(MOODS[0]);
  const [p, , ai] = useSmartState(
    { primary: '', secondary: '', accent: '', background: '', text: '' },
    'A 5-color hex palette (primary/secondary/accent/background/text)',
  );
  const loading = ai.status === 'loading';
  const filled = !!p.primary;

  return (
    <div className="w-full max-w-xl">
      <div className="rounded-2xl border border-fd-border bg-fd-card p-5 shadow-sm">
        <label
          htmlFor="smart-state-palette-mood"
          className="block text-xs font-medium uppercase tracking-wider text-fd-muted-foreground"
        >
          Mood or brand brief
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="smart-state-palette-mood"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="ocean sunrise…"
            style={{ fontSize: 16 }}
            className="flex-1 rounded-lg border border-fd-border bg-fd-background px-3 py-2 text-base text-fd-foreground outline-none focus:border-fd-foreground"
          />
          <button
            onClick={() => ai.generate(mood)}
            disabled={loading || !mood.trim()}
            className="inline-flex h-11 min-h-[44px] items-center gap-2 rounded-lg bg-fd-foreground px-4 text-sm font-medium text-fd-background shadow transition hover:opacity-90 disabled:opacity-50"
            style={{ touchAction: 'manipulation' }}
          >
            {loading ? 'Mixing…' : '🎨 Generate'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => setMood(m)}
              className="inline-flex items-center rounded-full border border-fd-border bg-fd-background px-3 py-1 text-[11px] text-fd-muted-foreground transition hover:bg-fd-accent"
              style={{ touchAction: 'manipulation' }}
            >
              {m}
            </button>
          ))}
        </div>

        {filled ? (
          <>
            <div className={`mt-5 grid grid-cols-5 gap-2 ${loading ? 'animate-pulse' : ''}`}>
              {ROLES.map((role) => (
                <div key={role} className="overflow-hidden rounded-xl border border-fd-border">
                  <div className="aspect-square w-full" style={{ background: p[role] }} />
                  <div className="bg-fd-background px-2 py-1.5 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-fd-muted-foreground">
                      {role}
                    </div>
                    <code className="font-mono text-[10px] text-fd-foreground">{p[role]}</code>
                  </div>
                </div>
              ))}
            </div>
            <div
              className="mt-4 overflow-hidden rounded-xl border border-fd-border"
              style={{ background: p.background, color: p.text }}
            >
              <div className="px-4 py-5">
                <div
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                  style={{ background: p.accent, color: p.background }}
                >
                  Preview
                </div>
                <h4 className="mt-2 text-base font-semibold" style={{ color: p.text }}>
                  Headline in your palette
                </h4>
                <p className="mt-1 text-sm" style={{ color: p.text, opacity: 0.75 }}>
                  Body copy uses the text color. Buttons use primary and secondary.
                </p>
                <div className="mt-3 flex gap-2">
                  <span
                    className="inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold"
                    style={{ background: p.primary, color: p.background }}
                  >
                    Primary
                  </span>
                  <span
                    className="inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold"
                    style={{ background: p.secondary, color: p.background }}
                  >
                    Secondary
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-fd-border bg-fd-background py-10 text-center text-sm text-fd-muted-foreground">
            Try &ldquo;ocean&rdquo;, &ldquo;sunset&rdquo;, &ldquo;forest&rdquo;, or &ldquo;cyberpunk&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}

export default function SmartStatePaletteStylized() {
  return (
    <SmartProvider client={client}>
      <Demo />
    </SmartProvider>
  );
}
