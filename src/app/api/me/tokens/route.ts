import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { readSession, SESSION_COOKIE } from '@/lib/session';

const BASE =
  process.env.NEXT_PUBLIC_EXPLORER_BASE ?? 'https://explorer.oasys.sand.mchdfgh.xyz';
const MAX_PAGES = 20;

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type TokenBalance = {
  value: string;
  token: {
    address?: string;
    name?: string | null;
    symbol?: string | null;
    decimals?: string | null;
    type?: string;
    icon_url?: string | null;
    exchange_rate?: string | null;
  };
};

async function fetchAll(address: string): Promise<TokenBalance[]> {
  const items: TokenBalance[] = [];
  let next: Record<string, unknown> | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${BASE}/api/v2/addresses/${address}/tokens`);
    url.searchParams.set('type', 'ERC-20');
    if (next) {
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === undefined) continue;
        url.searchParams.set(k, String(v));
      }
    }
    const r = await fetch(url, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    if (!r.ok) throw new Error(`upstream ${r.status} ${r.statusText}`);
    const j = (await r.json()) as {
      items?: TokenBalance[];
      next_page_params?: Record<string, unknown> | null;
    };
    if (Array.isArray(j.items)) items.push(...j.items);
    if (!j.next_page_params || !j.items || j.items.length === 0) break;
    next = j.next_page_params;
  }
  return items;
}

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await readSession(token);
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  try {
    const items = await fetchAll(session.address);
    return NextResponse.json({ tokens: items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
