/**
 * Tiny ID generator. Prefers `crypto.randomUUID()` (Safari 15.4+, Chrome 92+,
 * Firefox 95+, Node 19+). Falls back to a non-crypto random for older envs;
 * IDs are only used to key React lists + stitch streamed chunks, so randomness
 * quality is not load-bearing.
 */
export function uuid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
