'use client';

import { http, createConfig } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { mchVerse } from './chains';

export const wagmiConfig = createConfig({
  chains: [mchVerse],
  connectors: [injected({ shimDisconnect: true })],
  transports: { [mchVerse.id]: http() },
  ssr: true,
});
