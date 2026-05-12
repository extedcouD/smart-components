export interface CompletionPromptInput {
  value: string;
  context?: string;
}

export function buildCompletionPrompt({ value, context }: CompletionPromptInput): {
  system: string;
  prompt: string;
} {
  const system =
    'You are an inline text-completion model. Continue the user\'s text naturally from the cursor. ' +
    'Output ONLY the continuation — no quotes, no preamble, no explanation. ' +
    'Keep it concise (one short clause or sentence). ' +
    'If you would have nothing useful to add, return an empty string.' +
    (context ? `\n\nContext: ${context}` : '');
  return { system, prompt: value };
}

export interface SuggestionPromptInput {
  value: string;
  context?: string;
  count: number;
}

export function buildSuggestionPrompt({ value, context, count }: SuggestionPromptInput): {
  system: string;
  prompt: string;
} {
  const system =
    `You produce up to ${count} short autocomplete suggestions for the user's current input. ` +
    'Return suggestions as a JSON array of strings only — no prose, no markdown. ' +
    'Each suggestion should be a plausible completion or alternative of the current input. ' +
    'Order by relevance.' +
    (context ? `\n\nContext: ${context}` : '');
  return { system, prompt: value };
}

export function parseSuggestionResponse(raw: string): string[] {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === 'string');
    }
  } catch {
    // fall through
  }
  return trimmed
    .split('\n')
    .map((l) => l.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean);
}
