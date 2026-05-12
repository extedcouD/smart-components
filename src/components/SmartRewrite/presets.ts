export interface SmartRewritePreset {
  label: string;
  instruction: string;
}

export const DEFAULT_REWRITE_PRESETS: ReadonlyArray<SmartRewritePreset> = [
  {
    label: 'Shorter',
    instruction:
      'Rewrite this text to be roughly half the length while preserving the key meaning.',
  },
  {
    label: 'Formal',
    instruction: 'Rewrite this text in a polished, professional tone. Keep the same meaning.',
  },
  {
    label: 'Casual',
    instruction: 'Rewrite this text in a friendly, conversational tone. Keep the same meaning.',
  },
  {
    label: 'Fix grammar',
    instruction: 'Fix grammar, spelling, and punctuation. Do not change wording otherwise.',
  },
];
