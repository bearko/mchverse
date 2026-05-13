'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  useChainId,
  useReadContract,
  useReadContracts,
  useSignMessage,
} from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { SiweMessage } from 'siwe';
import { erc20Abi, formatUnits, isAddress } from 'viem';
import { mchVerse } from '@/lib/chains';
import { MCHC_ADDRESS, ERC721_LOOKUP_ABI } from '@/lib/tokens';
import type { ExplorerToken } from '@/lib/explorerTokens';

type SessionState =
  | { authenticated: true; address: `0x${string}`; chainId: number }
  | { authenticated: false };

type NftItem = {
  id?: string;
  token_id?: string;
  token_type?: string;
  value?: string;
  token?: {
    name?: string;
    symbol?: string;
    address?: string;
    type?: string;
    icon_url?: string | null;
  };
  metadata?: {
    name?: string;
    image?: string;
    description?: string;
    attributes?: Array<{ trait_type?: string; value?: unknown }>;
  } | null;
  image_url?: string | null;
  media_url?: string | null;
  animation_url?: string | null;
  external_app_url?: string | null;
};

type Collection = {
  address: string;
  name: string | null;
  symbol: string | null;
  type: string | null;
  iconUrl: string | null;
  items: NftItem[];
};

type FtBalance = {
  value: string;
  token: {
    address?: string;
    name?: string | null;
    symbol?: string | null;
    decimals?: string | null;
    type?: string;
    icon_url?: string | null;
    exchange_rate?: string | null;
  };
};

type Catalog = { matched: ExplorerToken[]; total: number; byType: Record<string, number> };

function ipfsToHttp(u: string | null | undefined): string | null {
  if (!u) return null;
  if (u.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${u.slice(7)}`;
  return u;
}

function resolveImage(it: NftItem): string | null {
  return (
    ipfsToHttp(it.image_url) ??
    ipfsToHttp(it.media_url) ??
    ipfsToHttp(it.metadata?.image) ??
    ipfsToHttp(it.token?.icon_url ?? null)
  );
}

function formatBalance(value: string, decimals: string | null | undefined): string {
  try {
    const d = decimals ? Number(decimals) : 0;
    return formatUnits(BigInt(value), d);
  } catch {
    return value;
  }
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();

  const [session, setSession] = useState<SessionState | null>(null);
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [nftTotal, setNftTotal] = useState<number>(0);
  const [tokens, setTokens] = useState<FtBalance[] | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [busy, setBusy] = useState(false);
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [nftsBusy, setNftsBusy] = useState(false);
  const [tokensBusy, setTokensBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<NftItem | null>(null);

  const onMchVerse = chainId === mchVerse.id;
  const onWrongChain = isConnected && !onMchVerse;

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

  const sessionAddress =
    session && session.authenticated ? session.address : null;

  useEffect(() => {
    if (!sessionAddress) {
      setCollections(null);
      setTokens(null);
      setNftTotal(0);
      return;
    }
    void loadTokens();
    void loadNfts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionAddress]);

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
    setCollections(null);
    setTokens(null);
    setNftTotal(0);
    await refreshSession();
  }

  async function loadNfts() {
    setError(null);
    setNftsBusy(true);
    try {
      const r = await fetch('/api/me/nfts', { cache: 'no-store' });
      if (!r.ok) throw new Error(`nfts failed: ${r.status}`);
      const j = (await r.json()) as { collections: Collection[]; total: number };
      setCollections(j.collections);
      setNftTotal(j.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setNftsBusy(false);
    }
  }

  async function loadTokens() {
    setError(null);
    setTokensBusy(true);
    try {
      const r = await fetch('/api/me/tokens', { cache: 'no-store' });
      if (!r.ok) throw new Error(`tokens failed: ${r.status}`);
      const j = (await r.json()) as { tokens: FtBalance[] };
      setTokens(j.tokens);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTokensBusy(false);
    }
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

  const [mchcSymbol, mchcDecimals] = mchcMeta.data ?? [undefined, undefined];
  const mchcDisplay = useMemo(() => {
    if (mchcBalance.data === undefined || mchcDecimals === undefined) return null;
    return `${formatUnits(mchcBalance.data, mchcDecimals)} ${mchcSymbol ?? 'MCHC'}`;
  }, [mchcBalance.data, mchcDecimals, mchcSymbol]);

  return (
    <main
      style={{
        maxWidth: 960,
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
      <p>
        <a href="/game" style={{ color: '#2563eb' }}>
          → Open the on-chain SLG (testnet PoC)
        </a>
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
            <button onClick={loadNfts} style={{ marginLeft: 8 }} disabled={nftsBusy}>
              {nftsBusy ? 'Refreshing NFTs…' : 'Refresh NFTs'}
            </button>
            <button onClick={loadTokens} style={{ marginLeft: 8 }} disabled={tokensBusy}>
              {tokensBusy ? 'Refreshing FTs…' : 'Refresh FTs'}
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

      <NftLookup />

      {session?.authenticated && (
        <section style={{ marginTop: 24 }}>
          <h2>6. Fungible tokens — ERC-20 ({tokens?.length ?? 0})</h2>
          {tokens === null && !tokensBusy ? (
            <p>—</p>
          ) : tokensBusy ? (
            <p>Loading…</p>
          ) : tokens && tokens.length === 0 ? (
            <p>No ERC-20 balances.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
                    <th></th>
                    <th>Symbol</th>
                    <th>Name</th>
                    <th>Balance</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens?.map((t) => (
                    <tr key={t.token.address} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ width: 32 }}>
                        {t.token.icon_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ipfsToHttp(t.token.icon_url) ?? undefined}
                            alt=""
                            width={24}
                            height={24}
                            style={{ borderRadius: 4 }}
                          />
                        ) : null}
                      </td>
                      <td>
                        <strong>{t.token.symbol ?? '-'}</strong>
                      </td>
                      <td>{t.token.name ?? '-'}</td>
                      <td>{formatBalance(t.value, t.token.decimals)}</td>
                      <td>
                        <code>{t.token.address}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {session?.authenticated && (
        <section style={{ marginTop: 24 }}>
          <h2>7. NFTs by collection ({nftTotal})</h2>
          {collections === null && !nftsBusy ? (
            <p>—</p>
          ) : nftsBusy ? (
            <p>Loading…</p>
          ) : collections && collections.length === 0 ? (
            <p>No NFTs.</p>
          ) : (
            collections?.map((col) => (
              <div key={col.address} style={{ marginBottom: 28 }}>
                <h3 style={{ marginBottom: 0 }}>
                  {col.name ?? '(no name)'}{' '}
                  {col.symbol && <span style={{ color: '#666' }}>({col.symbol})</span>}{' '}
                  <span style={{ color: '#888', fontWeight: 400 }}>
                    — {col.items.length} items · {col.type}
                  </span>
                </h3>
                <small>
                  <code>{col.address}</code>
                </small>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  {col.items.map((it, i) => {
                    const img = resolveImage(it);
                    const tokenId = it.id ?? it.token_id ?? '?';
                    return (
                      <button
                        key={`${col.address}-${tokenId}-${i}`}
                        onClick={() => setSelected(it)}
                        title={it.metadata?.name ?? `#${tokenId}`}
                        style={{
                          padding: 4,
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          background: '#fafafa',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'stretch',
                          gap: 4,
                        }}
                      >
                        <div
                          style={{
                            aspectRatio: '1 / 1',
                            background: '#eee',
                            borderRadius: 4,
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            color: '#888',
                          }}
                        >
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img}
                              alt={it.metadata?.name ?? `#${tokenId}`}
                              loading="lazy"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <span>no image</span>
                          )}
                        </div>
                        <small style={{ textAlign: 'center' }}>#{tokenId}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {selected && (
        <NftModal item={selected} onClose={() => setSelected(null)} />
      )}
    </main>
  );
}

function NftLookup() {
  const [addrInput, setAddrInput] = useState('');
  const [tokenIdInput, setTokenIdInput] = useState('');
  const [target, setTarget] = useState<{ address: `0x${string}`; tokenId: bigint } | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const meta = useReadContracts({
    allowFailure: true,
    contracts: target
      ? [
          {
            address: target.address,
            abi: ERC721_LOOKUP_ABI,
            functionName: 'name',
            chainId: mchVerse.id,
          },
          {
            address: target.address,
            abi: ERC721_LOOKUP_ABI,
            functionName: 'symbol',
            chainId: mchVerse.id,
          },
        ]
      : [],
    query: { enabled: !!target },
  });

  const owner = useReadContract({
    address: target?.address,
    abi: ERC721_LOOKUP_ABI,
    functionName: 'ownerOf',
    args: target ? [target.tokenId] : undefined,
    chainId: mchVerse.id,
    query: { enabled: !!target, retry: false },
  });

  const uri = useReadContract({
    address: target?.address,
    abi: ERC721_LOOKUP_ABI,
    functionName: 'tokenURI',
    args: target ? [target.tokenId] : undefined,
    chainId: mchVerse.id,
    query: { enabled: !!target, retry: false },
  });

  const metadataQ = useQuery({
    queryKey: [
      'nft-meta',
      target?.address ?? '',
      target?.tokenId.toString() ?? '',
      uri.data ?? '',
    ],
    queryFn: async () => {
      const u = uri.data as string | undefined;
      if (!u) return null;
      const url = u.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${u.slice(7)}` : u;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`metadata fetch ${r.status}`);
      return r.json();
    },
    enabled: !!uri.data,
    retry: false,
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const a = addrInput.trim();
    if (!isAddress(a)) {
      setFormError('Invalid contract address');
      return;
    }
    let id: bigint;
    try {
      id = BigInt(tokenIdInput.trim());
    } catch {
      setFormError('Invalid token id');
      return;
    }
    setTarget({ address: a as `0x${string}`, tokenId: id });
  }

  const nameResult = meta.data?.[0];
  const symbolResult = meta.data?.[1];
  const explorerBase =
    process.env.NEXT_PUBLIC_EXPLORER_BASE ?? 'https://explorer.oasys.mycryptoheroes.net';

  return (
    <section style={{ marginTop: 24 }}>
      <h2>5. NFT owner lookup</h2>
      <p>
        Reads <code>ownerOf(tokenId)</code> on any ERC-721 directly via MCH Verse RPC —
        useful when an NFT is missing from the Explorer index. Find a contract address in
        section 4 (catalog) and paste it below with the token ID.
      </p>
      <form
        onSubmit={onSubmit}
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
      >
        <input
          placeholder="Contract address (0x…)"
          value={addrInput}
          onChange={(e) => setAddrInput(e.target.value)}
          style={{ flex: 1, minWidth: 320, padding: '4px 6px' }}
        />
        <input
          placeholder="Token ID (e.g. 50120001)"
          value={tokenIdInput}
          onChange={(e) => setTokenIdInput(e.target.value)}
          style={{ width: 200, padding: '4px 6px' }}
        />
        <button type="submit">Lookup</button>
      </form>
      {formError && <p style={{ color: 'red' }}>{formError}</p>}
      {target && (
        <div style={{ marginTop: 12, fontSize: 14 }}>
          <p>
            Contract:{' '}
            <a
              href={`${explorerBase}/address/${target.address}`}
              target="_blank"
              rel="noreferrer"
            >
              <code>{target.address}</code>
            </a>
            <br />
            Collection:{' '}
            <strong>
              {nameResult?.status === 'success' ? String(nameResult.result) : '-'}
            </strong>{' '}
            {symbolResult?.status === 'success' && (
              <span>({String(symbolResult.result)})</span>
            )}
            <br />
            Token ID: <code>{target.tokenId.toString()}</code>
          </p>
          <p>
            Owner:{' '}
            {owner.isLoading ? (
              'Loading…'
            ) : owner.error ? (
              <span style={{ color: 'red' }}>RPC error: {owner.error.message}</span>
            ) : owner.data ? (
              <a
                href={`${explorerBase}/address/${owner.data}`}
                target="_blank"
                rel="noreferrer"
              >
                <code>{String(owner.data)}</code>
              </a>
            ) : (
              '-'
            )}
          </p>
          <p>
            tokenURI:{' '}
            {uri.isLoading ? (
              'Loading…'
            ) : uri.error ? (
              <span style={{ color: 'red' }}>{uri.error.message}</span>
            ) : (
              <code style={{ wordBreak: 'break-all' }}>{String(uri.data ?? '-')}</code>
            )}
          </p>
          {metadataQ.isFetching && <p>Loading metadata…</p>}
          {metadataQ.error && (
            <p style={{ color: 'red' }}>metadata: {String(metadataQ.error)}</p>
          )}
          {metadataQ.data && (
            <details>
              <summary style={{ cursor: 'pointer' }}>Metadata JSON</summary>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: 8,
                  fontSize: 11,
                  overflow: 'auto',
                }}
              >
                {JSON.stringify(metadataQ.data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

function NftModal({ item, onClose }: { item: NftItem; onClose: () => void }) {
  const img = resolveImage(item);
  const tokenId = item.id ?? item.token_id ?? '?';
  const attrs = item.metadata?.attributes ?? [];
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 8,
          maxWidth: 640,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 20,
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'transparent',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
        <h3 style={{ marginTop: 0 }}>
          {item.token?.name ?? '(no name)'} #{tokenId}
        </h3>
        {item.metadata?.name && item.metadata.name !== item.token?.name && (
          <p style={{ margin: '4px 0', color: '#444' }}>
            <strong>{item.metadata.name}</strong>
          </p>
        )}
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={item.metadata?.name ?? `#${tokenId}`}
            style={{ width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 6 }}
          />
        )}
        <dl style={{ marginTop: 12, fontSize: 14 }}>
          <dt><strong>Token ID</strong></dt>
          <dd>{tokenId}</dd>
          <dt><strong>Standard</strong></dt>
          <dd>{item.token?.type ?? item.token_type ?? '-'}</dd>
          <dt><strong>Quantity</strong></dt>
          <dd>{item.value ?? '1'}</dd>
          <dt><strong>Collection</strong></dt>
          <dd>
            {item.token?.name ?? '-'} {item.token?.symbol && `(${item.token.symbol})`}
            <br />
            <code style={{ fontSize: 12 }}>{item.token?.address}</code>
          </dd>
          {item.metadata?.description && (
            <>
              <dt><strong>Description</strong></dt>
              <dd style={{ whiteSpace: 'pre-wrap' }}>{item.metadata.description}</dd>
            </>
          )}
          {item.external_app_url && (
            <>
              <dt><strong>External link</strong></dt>
              <dd>
                <a href={item.external_app_url} target="_blank" rel="noreferrer">
                  {item.external_app_url}
                </a>
              </dd>
            </>
          )}
        </dl>
        {attrs.length > 0 && (
          <>
            <h4 style={{ marginBottom: 4 }}>Attributes</h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 6,
                fontSize: 13,
              }}
            >
              {attrs.map((a, i) => (
                <div
                  key={i}
                  style={{
                    border: '1px solid #eee',
                    borderRadius: 4,
                    padding: '4px 6px',
                  }}
                >
                  <div style={{ color: '#666', fontSize: 11 }}>
                    {a.trait_type ?? '—'}
                  </div>
                  <div>{String(a.value ?? '')}</div>
                </div>
              ))}
            </div>
          </>
        )}
        <details style={{ marginTop: 16 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: '#666' }}>
            Raw JSON
          </summary>
          <pre
            style={{
              background: '#f5f5f5',
              padding: 8,
              borderRadius: 4,
              fontSize: 11,
              overflow: 'auto',
            }}
          >
            {JSON.stringify(item, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
