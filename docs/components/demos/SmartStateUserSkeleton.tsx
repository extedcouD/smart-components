'use client';
import { SmartProvider, useSmartState } from '@extedcoud/smart-components';
import { makeSmartStateMock } from '@/lib/mock-client';

const client = makeSmartStateMock();

function Demo() {
  const [user, setUser, ai] = useSmartState(
    { name: '', age: 0, bio: '' },
    'a fictitious cyberpunk character',
  );
  return (
    <div>
      <button onClick={() => ai.generate()} disabled={ai.status === 'loading'}>
        {ai.status === 'loading' ? 'Generating…' : 'Roll a new user'}
      </button>
      <button
        onClick={() => setUser({ name: '', age: 0, bio: '' })}
        style={{ marginLeft: 8 }}
      >
        Reset
      </button>
      <pre style={{ marginTop: 12 }}>{JSON.stringify(user, null, 2)}</pre>
      {ai.error && <p style={{ color: 'crimson' }}>{ai.error.message}</p>}
    </div>
  );
}

export default function SmartStateUserSkeleton() {
  return (
    <SmartProvider client={client}>
      <Demo />
    </SmartProvider>
  );
}
