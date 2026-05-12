import { SMART_CLIENT_PROTOCOL_VERSION, type SmartClient } from '../../provider/types';

export interface AnthropicClientOptions {
  apiKey: string;
  defaultModel?: string;
}

/**
 * Placeholder for the v0.2 Anthropic adapter. The subpath export exists so consumers
 * can pin their imports today without worrying about future map churn.
 */
export function createAnthropicClient(_opts: AnthropicClientOptions): SmartClient {
  throw new Error(
    '[smart-components/adapters/anthropic] not implemented yet — planned for v0.2. ' +
      'For now use createProxyClient with an Anthropic-backed endpoint, or contribute the adapter.',
  );
  // Unreachable; satisfies type inference if someone calls in a runtime check.
  return {
    protocolVersion: SMART_CLIENT_PROTOCOL_VERSION,
    id: 'anthropic',
    capabilities: new Set(),
  };
}
