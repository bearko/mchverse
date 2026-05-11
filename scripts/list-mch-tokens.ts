#!/usr/bin/env node
/**
 * Enumerate MyCryptoHeroes-related tokens on MCH Verse via Blockscout v2.
 *
 * Env overrides:
 *   EXPLORER_BASE  default https://explorer.oasys.mycryptoheroes.net
 *   TYPES          default ERC-20,ERC-721,ERC-1155
 *   KEYWORDS       default mch,hero,land,extension,achievement,gum
 *   ALL            "1" disables keyword filtering
 *   MAX_PAGES      default 50 (per type)
 *   OUT            default mch-tokens.json
 *
 * Usage:
 *   npm run list:tokens
 *   ALL=1 OUT=all-tokens.json npm run list:tokens
 *   TYPES=ERC-721 KEYWORDS=hero npm run list:tokens
 */
import { writeFile } from 'node:fs/promises';
import { enumerateMchTokens } from '../src/lib/explorerTokens';

const explorerBase = process.env.EXPLORER_BASE;
const types = process.env.TYPES?.split(',').map((s) => s.trim()).filter(Boolean);
const keywords =
  process.env.ALL === '1'
    ? []
    : process.env.KEYWORDS?.split(',').map((s) => s.trim()).filter(Boolean);
const maxPages = process.env.MAX_PAGES ? Number(process.env.MAX_PAGES) : undefined;
const outFile = process.env.OUT ?? 'mch-tokens.json';

const { matched, total, byType } = await enumerateMchTokens({
  explorerBase,
  types,
  keywords,
  maxPages,
});

console.table(
  matched.map((t) => ({
    type: t.type,
    symbol: t.symbol,
    name: (t.name ?? '').slice(0, 40),
    holders: t.holders,
    address: t.address,
  })),
);

await writeFile(outFile, JSON.stringify(matched, null, 2));

const breakdown = Object.entries(byType)
  .map(([k, v]) => `${k}=${v}`)
  .join(', ');
process.stderr.write(`\nMatched ${matched.length}/${total} (${breakdown}). Wrote ${outFile}\n`);
