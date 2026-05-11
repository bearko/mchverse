import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.SESSION_JWT_SECRET ?? 'dev-only-secret-change-me',
);

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? 'mchverse_session';

export async function issueSession(address: `0x${string}`, chainId: number) {
  return new SignJWT({ chainId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(address)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function readSession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      address: payload.sub as `0x${string}`,
      chainId: payload.chainId as number,
    };
  } catch {
    return null;
  }
}
