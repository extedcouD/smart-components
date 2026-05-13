'use client';
import { SmartProvider } from '@extedcoud/smart-components';
import { useSmartState } from '@extedcoud/smart-components';
import { makeSmartStateMock } from '@/lib/mock-client';

const client = makeSmartStateMock();

function Demo() {
  const [n, setN, ai] = useSmartState(0, 'a random integer between 1 and 100');
  return (
    <div>
      <button onClick={() => ai.generate()} disabled={ai.status === 'loading'}>
        {ai.status === 'loading' ? 'Generating…' : 'Generate'}
      </button>
      <button onClick={() => setN(0)} style={{ marginLeft: 8 }}>
        Reset
      </button>
      <pre style={{ marginTop: 12 }}>n = {n}</pre>
    </div>
  );
}

export default function SmartStateRandomSkeleton() {
  return (
    <SmartProvider client={client}>
      <Demo />
    </SmartProvider>
  );
}
