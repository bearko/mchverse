// PoC-only in-memory nonce store. Replace with Redis (or similar) in production.
const TTL_MS = 10 * 60 * 1000;
const store = new Map<string, number>();

export function issueNonce(): string {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  store.set(nonce, Date.now() + TTL_MS);
  return nonce;
}

export function consumeNonce(nonce: string): boolean {
  const expiry = store.get(nonce);
  if (expiry === undefined) return false;
  store.delete(nonce);
  return expiry > Date.now();
}
