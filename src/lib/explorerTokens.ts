const DEFAULT_EXPLORER = 'https://explorer.oasys.mycryptoheroes.net';
const DEFAULT_TYPES = ['ERC-20', 'ERC-721', 'ERC-1155'] as const;
const DEFAULT_KEYWORDS = ['mch', 'hero', 'land', 'extension', 'achievement', 'gum'] as const;

export type ExplorerToken = {
  address: string;
  name: string | null;
  symbol: string | null;
  type: string;
  decimals: string | null;
  holders: string | null;
  total_supply: string | null;
  icon_url: string | null;
};

export type EnumerateOptions = {
  explorerBase?: string;
  types?: string[];
  keywords?: string[];
  maxPages?: number;
  pageDelayMs?: number;
};

export type EnumerateResult = {
  matched: ExplorerToken[];
  total: number;
  byType: Record<string, number>;
};

type Page = {
  items: Array<Record<string, unknown>>;
  next_page_params: Record<string, unknown> | null;
};

async function fetchPage(
  base: string,
  type: string,
  nextParams: Record<string, unknown> | null,
): Promise<Page> {
  const url = new URL(`${base}/api/v2/tokens`);
  url.searchParams.set('type', type);
  if (nextParams) {
    for (const [k, v] of Object.entries(nextParams)) {
      if (v === null || v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${url}`);
  return (await r.json()) as Page;
}

function pickToken(it: Record<string, unknown>, fallbackType: string): ExplorerToken {
  return {
    address: String(it.address ?? ''),
    name: (it.name as string | null) ?? null,
    symbol: (it.symbol as string | null) ?? null,
    type: String(it.type ?? fallbackType),
    decimals: (it.decimals as string | null) ?? null,
    holders: (it.holders as string | null) ?? null,
    total_supply: (it.total_supply as string | null) ?? null,
    icon_url: (it.icon_url as string | null) ?? null,
  };
}

export async function listTokensByType(
  type: string,
  opts: EnumerateOptions = {},
): Promise<ExplorerToken[]> {
  const base = opts.explorerBase ?? DEFAULT_EXPLORER;
  const maxPages = opts.maxPages ?? 50;
  const delay = opts.pageDelayMs ?? 100;

  const out: ExplorerToken[] = [];
  let next: Record<string, unknown> | null = null;
  for (let page = 0; page < maxPages; page++) {
    const { items, next_page_params } = await fetchPage(base, type, next);
    for (const it of items) out.push(pickToken(it, type));
    if (!next_page_params || items.length === 0) break;
    next = next_page_params;
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
  }
  return out;
}

export async function enumerateMchTokens(
  opts: EnumerateOptions = {},
): Promise<EnumerateResult> {
  const types = opts.types && opts.types.length > 0 ? opts.types : [...DEFAULT_TYPES];
  const keywords = (opts.keywords && opts.keywords.length > 0 ? opts.keywords : [...DEFAULT_KEYWORDS]).map(
    (k) => k.toLowerCase(),
  );

  const all: ExplorerToken[] = [];
  const byType: Record<string, number> = {};
  for (const t of types) {
    const tokens = await listTokensByType(t, opts);
    byType[t] = tokens.length;
    all.push(...tokens);
  }

  const matched =
    keywords.length === 0
      ? all
      : all.filter((tok) => {
          const hay = `${tok.name ?? ''} ${tok.symbol ?? ''}`.toLowerCase();
          return keywords.some((k) => hay.includes(k));
        });

  matched.sort((a, b) => Number(b.holders ?? 0) - Number(a.holders ?? 0));
  return { matched, total: all.length, byType };
}
