import { SignJWT, jwtVerify } from 'jose';

// Stateless nonce: signed JWT delivered as a short-lived httpOnly cookie.
// Works on serverless (Vercel) without shared storage. Replay window is
// bounded by the cookie TTL; for strict one-time-use, add a server-side
// denylist (Redis/KV) and check JTI on verify.
const secret = new TextEncoder().encode(
  process.env.SESSION_JWT_SECRET ?? 'dev-only-secret-change-me',
);

export const NONCE_COOKIE = 'mchverse_nonce';
const NONCE_TTL_SECONDS = 10 * 60;

export async function issueNonce(): Promise<{ nonce: string; token: string }> {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(nonce)
    .setIssuedAt()
    .setExpirationTime(`${NONCE_TTL_SECONDS}s`)
    .sign(secret);
  return { nonce, token };
}

export async function verifyNonce(
  token: string | undefined,
  presented: string,
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.sub === presented;
  } catch {
    return false;
  }
}

export { NONCE_TTL_SECONDS };
