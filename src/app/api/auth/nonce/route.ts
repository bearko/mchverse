import { NextResponse } from 'next/server';
import { NONCE_COOKIE, NONCE_TTL_SECONDS, issueNonce } from '@/lib/nonceStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { nonce, token } = await issueNonce();
  const res = NextResponse.json({ nonce });
  res.cookies.set(NONCE_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: NONCE_TTL_SECONDS,
  });
  return res;
}
