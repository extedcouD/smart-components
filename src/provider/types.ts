export const SMART_CLIENT_PROTOCOL_VERSION = 1 as const;
export type SmartClientProtocolVersion = typeof SMART_CLIENT_PROTOCOL_VERSION;

export type SmartCapability =
  | 'complete'
  | 'stream'
  | 'embed'
  | 'tools'
  | 'structured'
  | 'vision'
  | 'transcribe';

export interface CompleteRequest {
  prompt: string;
  system?: string;
  model?: string;
  signal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
  stop?: string[];
}
export type CompleteResponse = string;

export interface EmbedRequest {
  input: string | string[];
  model?: string;
  signal?: AbortSignal;
}
export type EmbedResponse = number[][];

export interface SmartClient {
  readonly protocolVersion: SmartClientProtocolVersion;
  readonly id?: string;
  readonly capabilities: ReadonlySet<SmartCapability>;
  complete?(req: CompleteRequest): Promise<CompleteResponse>;
  stream?(req: CompleteRequest): AsyncIterable<string>;
  embed?(req: EmbedRequest): Promise<EmbedResponse>;
}

type CapabilityMethodMap = {
  complete: 'complete';
  stream: 'stream';
  embed: 'embed';
};

export function assertCapability<C extends keyof CapabilityMethodMap>(
  client: SmartClient,
  cap: C,
): asserts client is SmartClient & Required<Pick<SmartClient, CapabilityMethodMap[C]>> {
  const method = (client as unknown as Record<string, unknown>)[cap];
  if (!client.capabilities.has(cap) || typeof method !== 'function') {
    const have = [...client.capabilities].join(', ') || 'none';
    throw new Error(
      `[smart-components] client "${client.id ?? 'unknown'}" missing capability "${cap}". Supports: [${have}]`,
    );
  }
}

export function hasCapability(client: SmartClient, cap: SmartCapability): boolean {
  return client.capabilities.has(cap) && typeof (client as unknown as Record<string, unknown>)[cap] === 'function';
}
