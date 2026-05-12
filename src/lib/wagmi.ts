'use client';

import { http } from 'wagmi';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mchVerse, mchVerseMainnet, mchVerseTestnet } from './chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId && typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.warn(
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. WalletConnect-based ' +
      'wallets will not work; only injected wallets (e.g. MetaMask extension) ' +
      'will connect. Get a free ID at https://cloud.reown.com/.',
  );
}

// Primary first so RainbowKit defaults to it; the other chain stays available
// so testnet users can also connect during development without reconfiguring.
const chains =
  mchVerse.id === mchVerseMainnet.id
    ? ([mchVerseMainnet, mchVerseTestnet] as const)
    : ([mchVerseTestnet, mchVerseMainnet] as const);

export const wagmiConfig = getDefaultConfig({
  appName: 'MCHVerse PoC',
  projectId: projectId || 'PLACEHOLDER_SET_NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
  chains,
  transports: {
    [mchVerseMainnet.id]: http(),
    [mchVerseTestnet.id]: http(),
  },
  ssr: true,
});
