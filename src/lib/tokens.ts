// MCHC mainnet address: 0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3
// MCHC testnet address: set via NEXT_PUBLIC_MCHC_ADDRESS once known.
const RAW_MCHC = (process.env.NEXT_PUBLIC_MCHC_ADDRESS ??
  '0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3') as `0x${string}`;

export const MCHC_ADDRESS = RAW_MCHC;

export const ERC721_LOOKUP_ABI = [
  {
    type: 'function',
    stateMutability: 'view',
    name: 'ownerOf',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'tokenURI',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'name',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'symbol',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
] as const;
