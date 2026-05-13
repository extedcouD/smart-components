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
