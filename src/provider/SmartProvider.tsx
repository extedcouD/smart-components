import { useMemo, type ReactNode } from 'react';
import { SMART_CLIENT_PROTOCOL_VERSION, type SmartClient } from './types';
import { SmartContext, type SmartContextValue } from './context';

export interface SmartProviderProps {
  client: SmartClient;
  model?: string;
  defaultSystem?: string;
  children: ReactNode;
}

export function SmartProvider({ client, model, defaultSystem, children }: SmartProviderProps) {
  if (client.protocolVersion !== SMART_CLIENT_PROTOCOL_VERSION) {
    throw new Error(
      `[smart-components] client protocolVersion ${String(client.protocolVersion)} does not match library ${SMART_CLIENT_PROTOCOL_VERSION}. Upgrade your adapter.`,
    );
  }

  const value = useMemo<SmartContextValue>(
    () => ({ client, model, defaultSystem }),
    [client, model, defaultSystem],
  );

  return <SmartContext.Provider value={value}>{children}</SmartContext.Provider>;
}
