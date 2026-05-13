import Link from 'next/link';
import HeroDemo from '@/components/demos/HeroDemo';

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const features = [
  {
    title: 'Ghost completion',
    desc: 'Copilot-style inline suggestions for inputs & textareas. Debounce, abort, LRU cache built in.',
  },
  {
    title: 'AI suggestions',
    desc: 'Headless combobox with full ARIA + keyboard + pointer support. Bring your own item renderer.',
  },
  {
    title: 'Rewrite primitives',
    desc: 'Render-prop rewrite component + ready-made paraphrase box & area. Streaming first paint.',
  },
  {
    title: 'Provider-agnostic',
    desc: 'Capability-based SmartClient interface. OpenAI, Anthropic, your proxy, or a mock — adapters are 4 lines.',
  },
  {
    title: 'Mobile-first',
    desc: 'IME composition gating, pointer events, imperative accept(), 44px touch targets. Tested on iOS + Android.',
  },
  {
    title: 'Headless',
    desc: 'Minimal default DOM. You style everything. No theme system, no design tokens — bring your own.',
  },
];

export default function HomePage() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-12 sm:pt-28 sm:pb-16">
        <div className="flex flex-col items-center text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card px-3 py-1 text-xs font-medium text-fd-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            v0.0.1 — stable surface
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            Headless React components, powered by an LLM.
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-lg text-fd-muted-foreground">
            Ghost completion, AI suggestions, rewrite primitives. Provider-agnostic. Mobile-first. You bring the styling — we ship the behavior + the plumbing.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/docs/getting-started"
              className="inline-flex h-11 items-center rounded-md bg-fd-foreground px-6 text-sm font-medium text-fd-background transition hover:opacity-90"
            >
              Get started
            </Link>
            <a
              href={`${base}/storybook/`}
              className="inline-flex h-11 items-center rounded-md border border-fd-border bg-fd-card px-6 text-sm font-medium text-fd-foreground transition hover:bg-fd-accent"
            >
              Open playground
            </a>
          </div>
          <code className="mt-6 rounded-md border border-fd-border bg-fd-card px-3 py-2 text-sm text-fd-muted-foreground">
            pnpm add @extedcoud/smart-components
          </code>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-sm">
          <div className="border-b border-fd-border bg-fd-secondary/50 px-5 py-3 text-xs font-medium text-fd-muted-foreground">
            Try it — type a few characters
          </div>
          <div className="demo-surface px-6 py-10 sm:px-10 sm:py-14">
            <HeroDemo />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <Link
          href="/docs/smart-state"
          className="group block overflow-hidden rounded-2xl border border-fd-border bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/10 to-cyan-500/10 p-8 transition hover:border-fd-foreground"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-background/80 px-3 py-1 text-xs font-medium text-fd-muted-foreground">
                <span className="size-1.5 rounded-full bg-fuchsia-500" />
                New — headline hook
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                <span className="bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
                  useSmartState
                </span>{' '}
                — typed AI state in one line
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-fd-muted-foreground sm:text-base">
                useState with an `ai.generate()` action. Shape is read from your initial value, so the model is constrained to return matching JSON — no schemas, no parsers, no boilerplate.
              </p>
            </div>
            <span className="hidden text-3xl transition group-hover:translate-x-1 sm:block">→</span>
          </div>
        </Link>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          What you get
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-fd-border bg-fd-card p-5"
            >
              <h3 className="mb-2 text-base font-semibold">{f.title}</h3>
              <p className="text-sm text-fd-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-xl border border-fd-border bg-fd-card p-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Ready to wire it in?
          </h2>
          <p className="mt-3 text-fd-muted-foreground">
            One provider, one component, one adapter. Five minutes start to finish.
          </p>
          <Link
            href="/docs/getting-started"
            className="mt-6 inline-flex h-11 items-center rounded-md bg-fd-foreground px-6 text-sm font-medium text-fd-background transition hover:opacity-90"
          >
            Read the guide
          </Link>
        </div>
      </section>
    </main>
  );
}
