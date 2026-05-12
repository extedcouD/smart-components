import { describe, it, expect } from 'vitest';
import { render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SmartProvider } from './SmartProvider';
import { useSmartClient } from './useSmartClient';
import { assertCapability, type SmartClient, SMART_CLIENT_PROTOCOL_VERSION } from './types';

function buildClient(overrides: Partial<SmartClient> = {}): SmartClient {
  return {
    protocolVersion: SMART_CLIENT_PROTOCOL_VERSION,
    id: 'test',
    capabilities: new Set(['complete']),
    async complete() {
      return 'ok';
    },
    ...overrides,
  };
}

describe('SmartProvider', () => {
  it('provides client via useSmartClient', () => {
    const client = buildClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SmartProvider client={client} model="m1">
        {children}
      </SmartProvider>
    );
    const { result } = renderHook(() => useSmartClient(), { wrapper });
    expect(result.current.client).toBe(client);
    expect(result.current.model).toBe('m1');
  });

  it('useSmartClient throws outside provider', () => {
    expect(() => renderHook(() => useSmartClient())).toThrowError(/SmartProvider/);
  });

  it('throws on protocolVersion mismatch', () => {
    const bad = { ...buildClient(), protocolVersion: 999 } as unknown as SmartClient;
    expect(() =>
      render(
        <SmartProvider client={bad}>
          <span />
        </SmartProvider>,
      ),
    ).toThrowError(/protocolVersion/);
  });
});

describe('assertCapability', () => {
  it('passes when capability is present', () => {
    const c = buildClient();
    expect(() => assertCapability(c, 'complete')).not.toThrow();
  });

  it('throws with helpful message when capability missing', () => {
    const c = buildClient({ capabilities: new Set(), complete: undefined });
    expect(() => assertCapability(c, 'complete')).toThrowError(/missing capability "complete"/);
  });
});
