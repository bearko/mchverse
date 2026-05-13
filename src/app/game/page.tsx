'use client';

import { useMemo, useState } from 'react';
import {
  useAccount,
  useChainId,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { mchVerse } from '@/lib/chains';
import { WORLD_ADDRESS, MAP_WIDTH, MAP_HEIGHT } from '@/lib/world';
import { worldAbi } from '@/lib/worldAbi';

const ZERO = '0x0000000000000000000000000000000000000000' as const;

type TileInfo = {
  terrain: number;
  owner: `0x${string}`;
  health: number;
  garrison: number;
  production: number;
  lastHarvest: bigint;
};

function shortAddr(a: string | undefined): string {
  if (!a || a === ZERO) return 'neutral';
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function colorFor(owner: string | undefined, me: string | undefined, selected: boolean): string {
  if (selected) return '#facc15';
  if (!owner || owner === ZERO) return '#e5e7eb';
  if (me && owner.toLowerCase() === me.toLowerCase()) return '#86efac';
  return '#fca5a5';
}

export default function GamePage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [selected, setSelected] = useState<{ x: number; y: number } | null>(null);
  const [spawnX, setSpawnX] = useState('5');
  const [spawnY, setSpawnY] = useState('5');
  const [heroTokenId, setHeroTokenId] = useState('0');

  const onMchVerse = chainId === mchVerse.id;
  const worldOk = !!WORLD_ADDRESS;

  const tileReads = useReadContracts({
    allowFailure: true,
    contracts: useMemo(() => {
      if (!worldOk) return [];
      const calls = [];
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          calls.push({
            address: WORLD_ADDRESS!,
            abi: worldAbi,
            functionName: 'mchSlg__getTileInfo' as const,
            args: [x, y] as const,
            chainId: mchVerse.id,
          });
        }
      }
      return calls;
    }, [worldOk]),
    query: { enabled: worldOk, refetchInterval: 4000 },
  });

  const armyRead = useReadContract({
    address: WORLD_ADDRESS,
    abi: worldAbi,
    functionName: 'mchSlg__getArmyInfo',
    args: address ? [address] : undefined,
    chainId: mchVerse.id,
    query: { enabled: worldOk && !!address, refetchInterval: 4000 },
  });

  const goldRead = useReadContract({
    address: WORLD_ADDRESS,
    abi: worldAbi,
    functionName: 'mchSlg__getPlayerGold',
    args: address ? [address] : undefined,
    chainId: mchVerse.id,
    query: { enabled: worldOk && !!address, refetchInterval: 4000 },
  });

  const { writeContractAsync, data: lastTxHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: txConfirming } = useWaitForTransactionReceipt({ hash: lastTxHash });

  function tile(x: number, y: number): TileInfo | null {
    const idx = y * MAP_WIDTH + x;
    const r = tileReads.data?.[idx];
    if (!r || r.status !== 'success') return null;
    const d = r.result as unknown as readonly [number, `0x${string}`, number, number, number, bigint];
    return {
      terrain: d[0],
      owner: d[1],
      health: d[2],
      garrison: d[3],
      production: d[4],
      lastHarvest: d[5],
    };
  }

  const myArmy =
    armyRead.data && armyRead.data[0] && armyRead.data[0] !== ZERO
      ? {
          owner: armyRead.data[0] as `0x${string}`,
          strength: Number(armyRead.data[1]),
          x: Number(armyRead.data[2]),
          y: Number(armyRead.data[3]),
        }
      : null;

  const registered = !!myArmy;
  const selectedTile = selected ? tile(selected.x, selected.y) : null;
  const adjacent =
    selected && myArmy
      ? Math.abs(selected.x - myArmy.x) + Math.abs(selected.y - myArmy.y) === 1
      : false;

  async function run(name: 'register' | 'move' | 'attack' | 'harvest', args: readonly unknown[]) {
    if (!WORLD_ADDRESS) return;
    try {
      await writeContractAsync({
        address: WORLD_ADDRESS,
        abi: worldAbi,
        functionName: `mchSlg__${name}` as const,
        args: args as never,
        chainId: mchVerse.id,
      });
    } catch (e) {
      console.error(e);
    }
  }

  if (!worldOk) {
    return (
      <main style={mainStyle}>
        <h1>MCHVerse SLG</h1>
        <p style={{ color: 'red' }}>
          <code>NEXT_PUBLIC_WORLD_ADDRESS</code> is not set. Deploy the World contract from{' '}
          <code>contracts/</code> and set the resulting address as an env var.
        </p>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <h1>MCHVerse SLG (testnet PoC)</h1>
      <p style={{ marginBottom: 12 }}>
        World: <code>{WORLD_ADDRESS}</code>
        <br />
        Expected chain <code>{mchVerse.id}</code> / connected <code>{chainId ?? '-'}</code>
      </p>

      <ConnectButton showBalance={false} chainStatus="full" />

      {isConnected && !onMchVerse && (
        <p style={{ color: 'orange' }}>Switch network to MCH Verse Testnet ({mchVerse.id}).</p>
      )}

      <section style={panel}>
        <h2 style={h2}>Status</h2>
        {!address ? (
          <p>Connect a wallet to view your state.</p>
        ) : (
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            <li>
              Address: <code>{address}</code>
            </li>
            <li>Gold: {goldRead.data?.toString() ?? '-'}</li>
            <li>
              Army:{' '}
              {myArmy
                ? `pos (${myArmy.x}, ${myArmy.y}) · str ${myArmy.strength}`
                : 'not registered'}
            </li>
          </ul>
        )}
      </section>

      <section style={panel}>
        <h2 style={h2}>Map</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${MAP_WIDTH}, 1fr)`,
            gap: 4,
            maxWidth: 480,
          }}
        >
          {Array.from({ length: MAP_HEIGHT }).map((_, y) =>
            Array.from({ length: MAP_WIDTH }).map((_, x) => {
              const t = tile(x, y);
              const isSelected = selected?.x === x && selected?.y === y;
              const isMe = myArmy && myArmy.x === x && myArmy.y === y;
              return (
                <button
                  key={`${x}-${y}`}
                  onClick={() => setSelected({ x, y })}
                  title={`(${x},${y})`}
                  style={{
                    aspectRatio: '1 / 1',
                    background: colorFor(t?.owner, address, !!isSelected),
                    border: isMe ? '2px solid #1f2937' : '1px solid #d1d5db',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 10,
                    padding: 0,
                  }}
                >
                  {isMe ? '👑' : t?.garrison ?? ''}
                </button>
              );
            }),
          )}
        </div>
        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
          Green = you · Red = enemy · Gray = neutral · Yellow = selected · 👑 = your army
        </p>
      </section>

      <section style={panel}>
        <h2 style={h2}>Selected tile</h2>
        {!selected || !selectedTile ? (
          <p>Click a tile.</p>
        ) : (
          <>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              <li>
                Coords: ({selected.x}, {selected.y})
              </li>
              <li>Owner: {shortAddr(selectedTile.owner)}</li>
              <li>Garrison: {selectedTile.garrison}</li>
              <li>Health: {selectedTile.health}</li>
              <li>Production: {selectedTile.production}/s</li>
            </ul>

            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!registered && (
                <button
                  onClick={() =>
                    run('register', [
                      BigInt(heroTokenId || '0'),
                      Number(spawnX),
                      Number(spawnY),
                    ])
                  }
                  disabled={isPending || txConfirming || !onMchVerse}
                >
                  Register here as ({spawnX},{spawnY})
                </button>
              )}
              {registered && adjacent && (
                <>
                  <button
                    onClick={() => run('move', [selected.x, selected.y])}
                    disabled={isPending || txConfirming || !onMchVerse}
                  >
                    Move
                  </button>
                  {selectedTile.owner.toLowerCase() !== address?.toLowerCase() && (
                    <button
                      onClick={() => run('attack', [selected.x, selected.y])}
                      disabled={isPending || txConfirming || !onMchVerse}
                    >
                      Attack
                    </button>
                  )}
                </>
              )}
              {registered &&
                selectedTile.owner.toLowerCase() === address?.toLowerCase() && (
                  <button
                    onClick={() => run('harvest', [selected.x, selected.y])}
                    disabled={isPending || txConfirming || !onMchVerse}
                  >
                    Harvest
                  </button>
                )}
            </div>
          </>
        )}
      </section>

      {!registered && (
        <section style={panel}>
          <h2 style={h2}>Register</h2>
          <p style={{ fontSize: 13, color: '#4b5563' }}>
            Pick a spawn location (0..{MAP_WIDTH - 1}). Hero token id can be 0 while the
            contract is configured without a hero contract.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label>
              spawnX
              <input
                value={spawnX}
                onChange={(e) => setSpawnX(e.target.value)}
                style={{ width: 60, marginLeft: 4 }}
              />
            </label>
            <label>
              spawnY
              <input
                value={spawnY}
                onChange={(e) => setSpawnY(e.target.value)}
                style={{ width: 60, marginLeft: 4 }}
              />
            </label>
            <label>
              heroTokenId
              <input
                value={heroTokenId}
                onChange={(e) => setHeroTokenId(e.target.value)}
                style={{ width: 120, marginLeft: 4 }}
              />
            </label>
            <button
              onClick={() =>
                run('register', [
                  BigInt(heroTokenId || '0'),
                  Number(spawnX),
                  Number(spawnY),
                ])
              }
              disabled={isPending || txConfirming || !onMchVerse}
            >
              {isPending || txConfirming ? 'Registering…' : 'Register'}
            </button>
          </div>
        </section>
      )}

      {writeError && (
        <p style={{ color: 'red', fontSize: 12 }}>
          tx error: {writeError.message.split('\n')[0]}
        </p>
      )}
      {lastTxHash && (
        <p style={{ fontSize: 12, color: '#4b5563' }}>
          last tx: <code>{lastTxHash}</code>{' '}
          {txConfirming ? '(confirming…)' : '(confirmed)'}
        </p>
      )}
    </main>
  );
}

const mainStyle: React.CSSProperties = {
  maxWidth: 760,
  margin: '2rem auto',
  padding: '1rem',
  fontFamily: 'system-ui, sans-serif',
  lineHeight: 1.5,
};

const panel: React.CSSProperties = {
  marginTop: 20,
  padding: 12,
  border: '1px solid #e5e7eb',
  borderRadius: 6,
};

const h2: React.CSSProperties = { margin: '0 0 8px', fontSize: 16 };
