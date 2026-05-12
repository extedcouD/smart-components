import { createContext } from 'react';
import type { SmartClient } from './types';

export interface SmartContextValue {
  client: SmartClient;
  model?: string;
  defaultSystem?: string;
}

export const SmartContext = createContext<SmartContextValue | null>(null);
