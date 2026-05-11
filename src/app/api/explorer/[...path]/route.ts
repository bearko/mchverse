import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readSession, SESSION_COOKIE } from '@/lib/session';

const BASE =
  process.env.NEXT_PUBLIC_EXPLORER_BASE ?? 'https://explorer.oasys.mycryptoheroes.net';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await readSession(token);
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const { path } = await ctx.params;
  const search = new URL(req.url).search;
  const upstream = `${BASE}/api/v2/${path.join('/')}${search}`;

  const r = await fetch(upstream, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  const body = await r.text();
  return new NextResponse(body, {
    status: r.status,
    headers: {
      'content-type': r.headers.get('content-type') ?? 'application/json',
    },
  });
}
