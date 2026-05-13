import { createMockClient } from '@extedcoud/smart-components/adapters/mock';

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function makeGhostMock(latencyMs = 220) {
  return createMockClient({
    latencyMs,
    complete: async (req) => {
      const text = req.prompt ?? '';
      const tail = text.split('\n').pop() ?? '';
      if (/hello/i.test(tail)) return ', how can I help you today?';
      if (/thanks?/i.test(tail)) return ' so much for your patience.';
      if (/dear /i.test(tail)) return 'team, I hope this message finds you well.';
      if (tail.endsWith(' ')) return 'looking forward to next steps.';
      return ' …keep typing for more.';
    },
  });
}

export function makeSuggestionMock(items: string[], latencyMs = 200) {
  return createMockClient({
    latencyMs,
    complete: async (req) => {
      const filtered = items.filter((i) =>
        i.toLowerCase().includes((req.prompt ?? '').toLowerCase()),
      );
      const out = filtered.length ? filtered : items;
      return out.slice(0, 5).join('\n');
    },
  });
}

const CYBERPUNK_NAMES = ['Nyx Vaeloria', 'Kade Vermillion', 'Riza Solune', 'Echo Marrow', 'Vex Halloway'];
const CYBERPUNK_BIOS = [
  'a memory-broker selling stolen dreams in the neon underlayers of Old Tokyo.',
  'a courier with mirror-eyes who runs encrypted hearts across the wire.',
  'a former corp samurai now ghost-coding for the resistance from a rain-soaked rooftop.',
  'a synth-jazz pianist whose fingers were replaced after the Kowloon riots.',
];
const FANTASY_BIOS = [
  'a wandering arcanist who reads runes from the cracks in cobblestone.',
  'a half-elven scout with a debt to the moon and three knives in her boot.',
  'a retired dragonslayer who runs a tavern near the Whispering Pass.',
];
const TAGS_SCIFI = ['cyberpunk', 'biotech', 'space-opera', 'dystopia', 'AI-ethics', 'transhumanism', 'first-contact'];
const TAGS_RECIPE = ['weeknight', 'one-pot', 'vegetarian', 'gluten-free', 'meal-prep', 'comfort-food'];
const TAGS_TRAVEL = ['hidden-gems', 'street-food', 'solo-travel', 'budget', 'island-hopping', 'off-the-beaten-path'];
const TODO_TASKS = [
  { title: 'Review pull request #421', priority: 'high', done: false },
  { title: 'Draft Q3 roadmap section', priority: 'medium', done: false },
  { title: 'Send invoice to client', priority: 'high', done: true },
];
const PRODUCTS = [
  { name: 'Aurora Headphones', price: 249, inStock: true },
  { name: 'Nimbus Backpack', price: 129, inStock: true },
  { name: 'Pulse Smart Lamp', price: 79, inStock: false },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const PALETTES: Record<string, Record<string, string>> = {
  ocean: { primary: '#0369a1', secondary: '#0ea5e9', accent: '#22d3ee', background: '#f0f9ff', text: '#0c4a6e' },
  sunset: { primary: '#dc2626', secondary: '#f97316', accent: '#facc15', background: '#fff7ed', text: '#7c2d12' },
  forest: { primary: '#166534', secondary: '#65a30d', accent: '#a3e635', background: '#f7fee7', text: '#14532d' },
  cyberpunk: { primary: '#db2777', secondary: '#7c3aed', accent: '#22d3ee', background: '#0f172a', text: '#fafafa' },
  neutral: { primary: '#475569', secondary: '#94a3b8', accent: '#0f172a', background: '#f8fafc', text: '#1e293b' },
};

const FORM_FIXTURES: Record<string, Record<string, unknown>> = {
  lunch: {
    title: 'Lunch with Sarah',
    attendees: ['Sarah Chen', 'You'],
    datetimeISO: '2026-05-14T12:00:00',
    location: 'Olive Garden',
    notes: 'Catch up on Q2 launch; bring the deck.',
  },
  sync: {
    title: 'Project kickoff sync',
    attendees: ['Engineering', 'Design', 'PM'],
    datetimeISO: '2026-05-15T10:00:00',
    location: 'Zoom',
    notes: 'Align on scope, owners, milestones for Q3.',
  },
  interview: {
    title: 'Onsite — senior engineer',
    attendees: ['Candidate', 'Hiring Manager', 'Tech Lead'],
    datetimeISO: '2026-05-20T14:00:00',
    location: 'HQ — Room 3B',
    notes: 'Coding round + system design; debrief immediately after.',
  },
};

const EXTRACT_FIXTURES: Record<string, Record<string, unknown>> = {
  budget: {
    summary: 'Q3 budget revision; updated forecast circulating by Friday, pending VP Eng sign-off.',
    actionItems: [
      'Maya: own updated forecast slide deck',
      'Jordan: finalize headcount numbers',
      'Circulate revised forecast to finance',
      'Get VP Eng sign-off before submission',
    ],
    urgency: 'high',
    dueDate: '2026-05-15',
  },
  migration: {
    summary: 'Migration deploy review; gated on staging validation and rollback plan.',
    actionItems: [
      'Validate migration on staging',
      'Document rollback steps',
      'Schedule deploy window',
    ],
    urgency: 'medium',
    dueDate: '2026-05-20',
  },
};

function smartStateFor(prompt: string): string {
  const ctx = prompt.toLowerCase();
  const schemaLine = prompt.split('\n').find((l) => l.startsWith('{')) ?? prompt;

  // ─── advanced shape-specific fixtures ──────────────────────────────────
  const hasField = (k: string) => new RegExp(`"${k}"`).test(schemaLine);

  // Palette: { primary, secondary, accent, background, text }
  if (hasField('primary') && hasField('secondary') && hasField('accent') && hasField('background')) {
    const key = (['ocean', 'sunset', 'forest', 'cyberpunk'] as const).find((k) => ctx.includes(k));
    return JSON.stringify(PALETTES[key ?? 'neutral']);
  }

  // Calendar event: { title, attendees, datetimeISO, location, notes }
  if (hasField('title') && hasField('attendees') && hasField('datetimeISO')) {
    const key = (['lunch', 'coffee', 'dinner'].some((k) => ctx.includes(k)) && 'lunch') ||
      (['sync', 'standup', 'kickoff'].some((k) => ctx.includes(k)) && 'sync') ||
      (ctx.includes('interview') && 'interview') || null;
    if (key) return JSON.stringify(FORM_FIXTURES[key]);
    return JSON.stringify({
      title: 'Untitled event',
      attendees: ['You'],
      datetimeISO: '2026-05-14T09:00:00',
      location: 'TBD',
      notes: 'Try: "lunch with Sarah tomorrow at noon at Olive Garden".',
    });
  }

  // Extract: { summary, actionItems, urgency, dueDate }
  if (hasField('summary') && hasField('actionItems') && hasField('urgency')) {
    if (/budget|forecast|headcount|finance/.test(ctx)) return JSON.stringify(EXTRACT_FIXTURES.budget);
    if (/migration|deploy|rollout|staging/.test(ctx)) return JSON.stringify(EXTRACT_FIXTURES.migration);
    return JSON.stringify({
      summary: 'No specific items extracted from the provided text.',
      actionItems: ['Add more detail to the source text and re-extract'],
      urgency: 'low',
      dueDate: '',
    });
  }

  // primitives
  if (/^"number"/.test(schemaLine) || schemaLine.trim() === '"number"') {
    if (/percent|percentage|0[ -]to[ -]100/.test(ctx)) return String(Math.floor(Math.random() * 101));
    if (/temperature|celsius/.test(ctx)) return String(Math.floor(Math.random() * 35) + 5);
    return String(Math.floor(Math.random() * 100) + 1);
  }
  if (schemaLine.trim() === '"string"') {
    if (/quote/.test(ctx)) return JSON.stringify('The future is already here — it\'s just not evenly distributed.');
    if (/headline|title/.test(ctx)) return JSON.stringify('Neon Skies Over a Quiet Earth');
    return JSON.stringify('Hello from the model.');
  }

  // arrays
  if (schemaLine.startsWith('["string"]')) {
    let pool = TAGS_SCIFI;
    if (/recipe|food|cook/.test(ctx)) pool = TAGS_RECIPE;
    else if (/travel|trip|journey/.test(ctx)) pool = TAGS_TRAVEL;
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
    return JSON.stringify(shuffled);
  }
  if (schemaLine.startsWith('[{')) {
    if (/todo|task/.test(ctx)) return JSON.stringify(TODO_TASKS);
    if (/product|item|inventory|shop/.test(ctx)) return JSON.stringify(PRODUCTS);
    return JSON.stringify(TODO_TASKS);
  }

  // object — try to fill fields plausibly
  const obj: Record<string, unknown> = {};
  const fieldMatches = schemaLine.matchAll(/"(\w+)":\s*("string"|"number"|"boolean"|\[[^\]]*\]|\{[^}]*\})/g);
  const character =
    /cyberpunk|hacker|netrunner/.test(ctx) ? 'cyberpunk' :
    /wizard|elf|fantasy|dragon|knight/.test(ctx) ? 'fantasy' :
    null;
  for (const m of fieldMatches) {
    const [, key, type] = m;
    if (type === '"string"') {
      if (/name/i.test(key)) obj[key] = character === 'fantasy' ? pick(['Arwyn Stormholt', 'Bramble Quickfoot', 'Sir Roderic the Patient']) : pick(CYBERPUNK_NAMES);
      else if (/bio|description|summary|about/i.test(key)) obj[key] = character === 'fantasy' ? pick(FANTASY_BIOS) : pick(CYBERPUNK_BIOS);
      else if (/email/i.test(key)) obj[key] = 'someone@example.com';
      else if (/city|location/i.test(key)) obj[key] = pick(['Neo Kyoto', 'Lisbon', 'Reykjavík', 'Karachi']);
      else if (/title|headline/i.test(key)) obj[key] = 'Neon Skies Over a Quiet Earth';
      else if (/color/i.test(key)) obj[key] = pick(['cobalt', 'magenta', 'amber', 'jade']);
      else obj[key] = pick(['indigo', 'amber', 'cobalt', 'jade']);
    } else if (type === '"number"') {
      if (/age/i.test(key)) obj[key] = 20 + Math.floor(Math.random() * 40);
      else if (/price|cost/i.test(key)) obj[key] = 10 + Math.floor(Math.random() * 200);
      else if (/year/i.test(key)) obj[key] = 1900 + Math.floor(Math.random() * 200);
      else obj[key] = Math.floor(Math.random() * 100);
    } else if (type === '"boolean"') {
      obj[key] = Math.random() > 0.5;
    } else if (type.startsWith('[')) {
      obj[key] = [...TAGS_SCIFI].sort(() => Math.random() - 0.5).slice(0, 3);
    } else {
      obj[key] = {};
    }
  }
  return JSON.stringify(obj);
}

export function makeSmartStateMock(latencyMs = 700) {
  return createMockClient({
    latencyMs,
    complete: async (req) => smartStateFor(req.prompt ?? ''),
  });
}

export function makeRewriteMock(latencyMs = 600) {
  return createMockClient({
    latencyMs,
    complete: async (req) => {
      await delay(0);
      const instruction = (req.system ?? '').toLowerCase();
      const text = req.prompt ?? '';
      if (instruction.includes('shorter')) {
        return text.split(/\s+/).slice(0, Math.max(4, Math.floor(text.split(/\s+/).length / 2))).join(' ') + '.';
      }
      if (instruction.includes('formal')) {
        return `I would like to inform you that ${text.replace(/^./, (c) => c.toLowerCase())}`;
      }
      if (instruction.includes('casual')) {
        return `hey — ${text.replace(/^./, (c) => c.toLowerCase())}`;
      }
      if (instruction.includes('grammar')) {
        return text.replace(/\s+/g, ' ').replace(/^./, (c) => c.toUpperCase()).replace(/[.!?]?$/, '.');
      }
      return text.toUpperCase();
    },
  });
}
