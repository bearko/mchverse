'use client';

import { http } from 'wagmi';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mchVerse } from './chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId && typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.warn(
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. WalletConnect-based ' +
      'wallets will not work; only injected wallets (e.g. MetaMask extension) ' +
      'will connect. Get a free ID at https://cloud.reown.com/.',
  );
}

export const wagmiConfig = getDefaultConfig({
  appName: 'MCHVerse PoC',
  projectId: projectId || 'PLACEHOLDER_SET_NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
  chains: [mchVerse],
  transports: { [mchVerse.id]: http() },
  ssr: true,
});
