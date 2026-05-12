import { useState } from 'react';

export interface LRU<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  clear(): void;
}

function createLRU<K, V>(capacity: number): LRU<K, V> {
  const map = new Map<K, V>();
  return {
    get(key) {
      if (!map.has(key)) return undefined;
      const v = map.get(key) as V;
      map.delete(key);
      map.set(key, v);
      return v;
    },
    set(key, value) {
      if (map.has(key)) map.delete(key);
      else if (map.size >= capacity) {
        const oldest = map.keys().next().value;
        if (oldest !== undefined) map.delete(oldest);
      }
      map.set(key, value);
    },
    has(key) {
      return map.has(key);
    },
    clear() {
      map.clear();
    },
  };
}

export function useLRU<K, V>(capacity = 32): LRU<K, V> {
  const [lru] = useState(() => createLRU<K, V>(capacity));
  return lru;
}
