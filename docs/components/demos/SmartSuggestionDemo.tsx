'use client';
import { useState } from 'react';
import { SmartProvider, SmartSuggestion } from '@extedcoud/smart-components';
import { makeSuggestionMock } from '@/lib/mock-client';

const FRUITS = [
  'Apple',
  'Apricot',
  'Banana',
  'Blackberry',
  'Blueberry',
  'Cherry',
  'Cranberry',
  'Grape',
  'Mango',
  'Orange',
  'Peach',
  'Pear',
  'Pineapple',
  'Plum',
  'Raspberry',
  'Strawberry',
  'Watermelon',
];

const client = makeSuggestionMock(FRUITS);

export default function SmartSuggestionDemo() {
  const [value, setValue] = useState('');
  return (
    <SmartProvider client={client}>
      <div className="w-full max-w-md">
        <SmartSuggestion
          value={value}
          onChange={setValue}
          placeholder="Type to filter (try 'b' or 'p')…"
          wrapperClassName="relative"
          className="w-full rounded-md border border-fd-border bg-fd-background px-3 py-2 text-base text-fd-foreground outline-none focus:border-fd-foreground"
          listClassName="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-md border border-fd-border bg-fd-card shadow-lg"
          itemClassName="cursor-pointer px-3 py-2 text-sm text-fd-foreground hover:bg-fd-accent aria-selected:bg-fd-accent"
        />
      </div>
    </SmartProvider>
  );
}
