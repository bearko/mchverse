import { NextRequest, NextResponse } from 'next/server';
import { enumerateMchTokens } from '@/lib/explorerTokens';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function parseList(v: string | null): string[] | undefined {
  if (!v) return undefined;
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const types = parseList(u.searchParams.get('types'));
  const keywords =
    u.searchParams.get('all') === '1'
      ? []
      : parseList(u.searchParams.get('keywords'));
  const maxPagesParam = u.searchParams.get('maxPages');
  const maxPages = maxPagesParam ? Number(maxPagesParam) : undefined;

  try {
    const result = await enumerateMchTokens({
      explorerBase:
        process.env.NEXT_PUBLIC_EXPLORER_BASE ?? 'https://explorer.oasys.sand.mchdfgh.xyz',
      types,
      keywords,
      maxPages,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
