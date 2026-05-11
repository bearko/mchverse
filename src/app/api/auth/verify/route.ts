import { NextRequest, NextResponse } from 'next/server';
import { SiweMessage } from 'siwe';
import { consumeNonce } from '@/lib/nonceStore';
import { issueSession, SESSION_COOKIE } from '@/lib/session';

const EXPECTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 29548);

export async function POST(req: NextRequest) {
  const { message, signature } = (await req.json()) as {
    message?: string;
    signature?: string;
  };
  if (!message || !signature) {
    return NextResponse.json({ error: 'message and signature required' }, { status: 400 });
  }

  let parsed: SiweMessage;
  try {
    parsed = new SiweMessage(message);
  } catch (e) {
    return NextResponse.json({ error: 'malformed SIWE message' }, { status: 400 });
  }

  if (parsed.chainId !== EXPECTED_CHAIN_ID) {
    return NextResponse.json(
      { error: `unexpected chainId ${parsed.chainId}, expected ${EXPECTED_CHAIN_ID}` },
      { status: 400 },
    );
  }
  if (!consumeNonce(parsed.nonce)) {
    return NextResponse.json({ error: 'invalid or expired nonce' }, { status: 400 });
  }

  const result = await parsed.verify({ signature });
  if (!result.success) {
    return NextResponse.json({ error: 'signature verification failed' }, { status: 401 });
  }

  const address = result.data.address as `0x${string}`;
  const token = await issueSession(address, result.data.chainId);
  const res = NextResponse.json({ address, chainId: result.data.chainId });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
