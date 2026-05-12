import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { readSession, SESSION_COOKIE } from '@/lib/session';

const BASE =
  process.env.NEXT_PUBLIC_EXPLORER_BASE ?? 'https://explorer.oasys.mycryptoheroes.net';
const MAX_PAGES = 100;

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type NftItem = {
  id?: string;
  token_id?: string;
  token_type?: string;
  value?: string;
  token?: {
    name?: string;
    symbol?: string;
    address?: string;
    type?: string;
    icon_url?: string | null;
  };
  metadata?: {
    name?: string;
    image?: string;
    description?: string;
    attributes?: Array<{ trait_type?: string; value?: unknown }>;
  } | null;
  image_url?: string | null;
  media_url?: string | null;
  animation_url?: string | null;
  external_app_url?: string | null;
};

type Collection = {
  address: string;
  name: string | null;
  symbol: string | null;
  type: string | null;
  iconUrl: string | null;
  items: NftItem[];
};

async function fetchAllNfts(address: string): Promise<NftItem[]> {
  const items: NftItem[] = [];
  let next: Record<string, unknown> | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${BASE}/api/v2/addresses/${address}/nft`);
    url.searchParams.set('type', 'ERC-721,ERC-1155');
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
      items?: NftItem[];
      next_page_params?: Record<string, unknown> | null;
    };
    if (Array.isArray(j.items)) items.push(...j.items);
    if (!j.next_page_params || !j.items || j.items.length === 0) break;
    next = j.next_page_params;
  }
  return items;
}

function groupByCollection(items: NftItem[]): Collection[] {
  const map = new Map<string, Collection>();
  for (const it of items) {
    const addr = (it.token?.address ?? '').toLowerCase();
    if (!addr) continue;
    let col = map.get(addr);
    if (!col) {
      col = {
        address: addr,
        name: it.token?.name ?? null,
        symbol: it.token?.symbol ?? null,
        type: it.token?.type ?? null,
        iconUrl: it.token?.icon_url ?? null,
        items: [],
      };
      map.set(addr, col);
    }
    col.items.push(it);
  }
  return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
}

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await readSession(token);
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  try {
    const items = await fetchAllNfts(session.address);
    const collections = groupByCollection(items);
    return NextResponse.json({ collections, total: items.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
