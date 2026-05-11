import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { readSession, SESSION_COOKIE } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await readSession(token);
  if (!session) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, ...session });
}
