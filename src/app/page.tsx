'use client';

import { useEffect, useState } from 'react';
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSignMessage,
  useSwitchChain,
} from 'wagmi';
import { SiweMessage } from 'siwe';
import { mchVerse } from '@/lib/chains';

type SessionState =
  | { authenticated: true; address: `0x${string}`; chainId: number }
  | { authenticated: false };

type NftItem = {
  id?: string;
  token_id?: string;
  token?: { name?: string; symbol?: string; address?: string; type?: string };
};

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, isPending: connecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();

  const [session, setSession] = useState<SessionState | null>(null);
  const [nfts, setNfts] = useState<NftItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshSession();
  }, []);

  async function refreshSession() {
    const r = await fetch('/api/auth/me', { cache: 'no-store' });
    setSession(await r.json());
  }

  async function signIn() {
    if (!address) return;
    setError(null);
    setBusy(true);
    try {
      const { nonce } = await (await fetch('/api/auth/nonce')).json();
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to MCHVerse PoC',
        uri: window.location.origin,
        version: '1',
        chainId: mchVerse.id,
        nonce,
        issuedAt: new Date().toISOString(),
      }).prepareMessage();

      const signature = await signMessageAsync({ message });
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });
      if (!res.ok) throw new Error(`verify failed: ${res.status} ${await res.text()}`);
      await refreshSession();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setNfts(null);
    await refreshSession();
  }

  async function loadNfts() {
    if (!session || !session.authenticated) return;
    setError(null);
    try {
      const r = await fetch(
        `/api/explorer/addresses/${session.address}/nft?type=ERC-721%2CERC-1155`,
      );
      const j = await r.json();
      setNfts(Array.isArray(j.items) ? j.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const onWrongChain = isConnected && chainId !== mchVerse.id;

  return (
    <main
      style={{
        maxWidth: 760,
        margin: '2rem auto',
        padding: '1rem',
        fontFamily: 'system-ui, sans-serif',
        lineHeight: 1.6,
      }}
    >
      <h1>MCHVerse Wallet Auth PoC</h1>
      <p>
        Expected chain: <code>{mchVerse.id}</code> (MCH Verse) — Connected:{' '}
        <code>{chainId ?? '-'}</code>
      </p>

      <section style={{ marginTop: 16 }}>
        <h2>1. Wallet</h2>
        {!isConnected ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {connectors.map((c) => (
              <button
                key={c.uid}
                onClick={() => connect({ connector: c, chainId: mchVerse.id })}
                disabled={connecting}
              >
                Connect with {c.name}
              </button>
            ))}
            {connectError && <p style={{ color: 'red' }}>{connectError.message}</p>}
          </div>
        ) : (
          <div>
            <p>
              Address: <code>{address}</code>
            </p>
            {onWrongChain && (
              <p style={{ color: 'orange' }}>
                Wrong chain.{' '}
                <button onClick={() => switchChain({ chainId: mchVerse.id })}>
                  Switch to MCH Verse
                </button>
              </p>
            )}
            <button onClick={() => disconnect()}>Disconnect</button>
          </div>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>2. Session (SIWE)</h2>
        {session?.authenticated ? (
          <>
            <p>
              Signed in as <code>{session.address}</code> (chain {session.chainId})
            </p>
            <button onClick={logout}>Sign out</button>
            <button onClick={loadNfts} style={{ marginLeft: 8 }}>
              Load my NFTs from Explorer
            </button>
          </>
        ) : (
          <button onClick={signIn} disabled={!isConnected || busy || onWrongChain}>
            {busy ? 'Signing…' : 'Sign in with Ethereum'}
          </button>
        )}
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </section>

      {nfts && (
        <section style={{ marginTop: 24 }}>
          <h2>3. NFTs ({nfts.length})</h2>
          {nfts.length === 0 ? (
            <p>No NFTs found.</p>
          ) : (
            <ul>
              {nfts.map((it, i) => (
                <li key={i}>
                  <code>{it.token?.symbol ?? it.token?.name ?? 'token'}</code> #
                  {it.id ?? it.token_id} — <code>{it.token?.address}</code> (
                  {it.token?.type})
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
