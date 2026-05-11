import { defineChain } from 'viem';

export const mchVerse = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 29548),
  name: 'MCH Verse',
  nativeCurrency: { name: 'OAS', symbol: 'OAS', decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL ?? 'https://rpc.oasys.mycryptoheroes.net'],
    },
  },
  blockExplorers: {
    default: {
      name: 'MCH Verse Explorer',
      url: process.env.NEXT_PUBLIC_EXPLORER_BASE ?? 'https://explorer.oasys.mycryptoheroes.net',
    },
  },
});
