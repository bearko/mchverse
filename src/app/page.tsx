'use client';

import { useEffect, useState } from 'react';
import {
  useAccount,
  useChainId,
  useReadContract,
  useReadContracts,
  useSignMessage,
} from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { SiweMessage } from 'siwe';
import { erc20Abi, formatUnits } from 'viem';
import { mchVerse } from '@/lib/chains';
import { MCHC_ADDRESS } from '@/lib/tokens';
import type { ExplorerToken } from '@/lib/explorerTokens';

type SessionState =
  | { authenticated: true; address: `0x${string}`; chainId: number }
  | { authenticated: false };

type NftItem = {
  id?: string;
  token_id?: string;
  token?: { name?: string; symbol?: string; address?: string; type?: string };
  metadata?: { name?: string; image?: string } | null;
  image_url?: string | null;
};

type Catalog = { matched: ExplorerToken[]; total: number; byType: Record<string, number> };

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();

  const [session, setSession] = useState<SessionState | null>(null);
  const [nfts, setNfts] = useState<NftItem[] | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onMchVerse = chainId === mchVerse.id;

  const mchcMeta = useReadContracts({
    allowFailure: false,
    contracts: [
      { address: MCHC_ADDRESS, abi: erc20Abi, functionName: 'symbol', chainId: mchVerse.id },
      { address: MCHC_ADDRESS, abi: erc20Abi, functionName: 'decimals', chainId: mchVerse.id },
    ],
    query: { staleTime: 60 * 60 * 1000 },
  });

  const mchcBalance = useReadContract({
    address: MCHC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: mchVerse.id,
    query: { enabled: !!address && onMchVerse },
  });

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

  async function loadCatalog(all: boolean) {
    setError(null);
    setCatalogBusy(true);
    try {
      const q = all ? '?all=1' : '';
      const r = await fetch(`/api/tokens/mch${q}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`catalog failed: ${r.status} ${await r.text()}`);
      setCatalog(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCatalogBusy(false);
    }
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

  const onWrongChain = isConnected && !onMchVerse;
  const [mchcSymbol, mchcDecimals] = mchcMeta.data ?? [undefined, undefined];
  const mchcDisplay =
    mchcBalance.data !== undefined && mchcDecimals !== undefined
      ? `${formatUnits(mchcBalance.data, mchcDecimals)} ${mchcSymbol ?? 'MCHC'}`
      : null;

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
        <ConnectButton showBalance={false} chainStatus="full" />
        {address && (
          <p style={{ marginTop: 8 }}>
            Address: <code>{address}</code>
          </p>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>2. On-chain read (viem readContract)</h2>
        <p>
          Contract: <code>{MCHC_ADDRESS}</code>
        </p>
        {!isConnected ? (
          <p>Connect a wallet to read your balance.</p>
        ) : onWrongChain ? (
          <p>Switch to MCH Verse to read your balance.</p>
        ) : mchcBalance.isLoading ? (
          <p>Loading balance…</p>
        ) : mchcBalance.error ? (
          <p style={{ color: 'red' }}>RPC error: {mchcBalance.error.message}</p>
        ) : (
          <p>
            balanceOf(you) = <strong>{mchcDisplay ?? '-'}</strong>
          </p>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>3. Session (SIWE)</h2>
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

      <section style={{ marginTop: 24 }}>
        <h2>4. MCH token catalog (Explorer /api/v2/tokens)</h2>
        <p>
          Paginates Blockscout v2 for ERC-20/721/1155 and filters by keyword
          (mch, hero, land, extension, achievement, gum).
        </p>
        <button onClick={() => loadCatalog(false)} disabled={catalogBusy}>
          {catalogBusy ? 'Loading…' : 'List MCH-related tokens'}
        </button>
        <button
          onClick={() => loadCatalog(true)}
          disabled={catalogBusy}
          style={{ marginLeft: 8 }}
        >
          List all tokens
        </button>
        {catalog && (
          <>
            <p style={{ marginTop: 8 }}>
              Matched <strong>{catalog.matched.length}</strong> / scanned{' '}
              <strong>{catalog.total}</strong> (
              {Object.entries(catalog.byType).map(([k, v]) => `${k}=${v}`).join(', ')})
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
                    <th>Type</th>
                    <th>Symbol</th>
                    <th>Name</th>
                    <th>Holders</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.matched.map((t) => (
                    <tr key={t.address} style={{ borderBottom: '1px solid #eee' }}>
                      <td>{t.type}</td>
                      <td>{t.symbol ?? '-'}</td>
                      <td>{t.name ?? '-'}</td>
                      <td>{t.holders ?? '-'}</td>
                      <td>
                        <code>{t.address}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {nfts && (
        <section style={{ marginTop: 24 }}>
          <h2>5. NFTs ({nfts.length})</h2>
          {nfts.length === 0 ? (
            <p>No NFTs found.</p>
          ) : (
            <ul style={{ paddingLeft: 18 }}>
              {nfts.map((it, i) => {
                const collection = it.token?.name ?? 'Unknown collection';
                const symbol = it.token?.symbol;
                const tokenId = it.id ?? it.token_id ?? '?';
                const instanceName = it.metadata?.name;
                return (
                  <li key={i} style={{ marginBottom: 8 }}>
                    <strong>{collection}</strong>
                    {symbol && <> ({symbol})</>} #{tokenId}
                    {instanceName && <> — {instanceName}</>}
                    <br />
                    <small>
                      <code>{it.token?.address}</code> ({it.token?.type})
                    </small>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
