import { useContext } from 'react';
import { SmartContext, type SmartContextValue } from './context';

export function useSmartClient(): SmartContextValue {
  const ctx = useContext(SmartContext);
  if (!ctx) {
    throw new Error('[smart-components] useSmartClient must be used inside <SmartProvider>.');
  }
  return ctx;
}
