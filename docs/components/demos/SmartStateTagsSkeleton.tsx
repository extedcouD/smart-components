'use client';
import { SmartProvider, useSmartState } from '@extedcoud/smart-components';
import { makeSmartStateMock } from '@/lib/mock-client';

const client = makeSmartStateMock();

function Demo() {
  const [tags, , ai] = useSmartState<string[]>([], 'tags for a sci-fi blog post', {
    shape: { type: 'array', item: 'string' },
  });
  return (
    <div>
      <button onClick={() => ai.generate()} disabled={ai.status === 'loading'}>
        {ai.status === 'loading' ? 'Generating…' : 'Generate tags'}
      </button>
      <pre style={{ marginTop: 12 }}>{JSON.stringify(tags)}</pre>
    </div>
  );
}

export default function SmartStateTagsSkeleton() {
  return (
    <SmartProvider client={client}>
      <Demo />
    </SmartProvider>
  );
}
