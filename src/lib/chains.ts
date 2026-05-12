import { defineChain, type Chain } from 'viem';

const TESTNET_DEFAULTS = {
  id: 420,
  name: 'MCH Verse Testnet',
  rpc: 'https://rpc.oasys.sand.mchdfgh.xyz',
  explorer: 'https://explorer.oasys.sand.mchdfgh.xyz',
  subgraph: 'https://graph.oasys.sand.mchdfgh.xyz/subgraphs/graphql',
} as const;

const MAINNET_DEFAULTS = {
  id: 29548,
  name: 'MCH Verse',
  rpc: 'https://rpc.oasys.mycryptoheroes.net',
  explorer: 'https://explorer.oasys.mycryptoheroes.net',
} as const;

function buildChain(c: { id: number; name: string; rpc: string; explorer: string }): Chain {
  return defineChain({
    id: c.id,
    name: c.name,
    nativeCurrency: { name: 'OAS', symbol: 'OAS', decimals: 18 },
    rpcUrls: { default: { http: [c.rpc] } },
    blockExplorers: { default: { name: `${c.name} Explorer`, url: c.explorer } },
    testnet: c.id !== MAINNET_DEFAULTS.id,
  });
}

export const mchVerseMainnet = buildChain(MAINNET_DEFAULTS);
export const mchVerseTestnet = buildChain(TESTNET_DEFAULTS);

const primaryId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? TESTNET_DEFAULTS.id);

// Allow per-env overrides of RPC / explorer for the primary chain.
function withOverrides(base: Chain): Chain {
  return defineChain({
    id: base.id,
    name: base.name,
    nativeCurrency: base.nativeCurrency,
    rpcUrls: {
      default: {
        http: [process.env.NEXT_PUBLIC_RPC_URL ?? base.rpcUrls.default.http[0]],
      },
    },
    blockExplorers: {
      default: {
        name: base.blockExplorers!.default.name,
        url: process.env.NEXT_PUBLIC_EXPLORER_BASE ?? base.blockExplorers!.default.url,
      },
    },
    testnet: base.testnet,
  });
}

export const mchVerse =
  primaryId === MAINNET_DEFAULTS.id
    ? withOverrides(mchVerseMainnet)
    : withOverrides(mchVerseTestnet);
