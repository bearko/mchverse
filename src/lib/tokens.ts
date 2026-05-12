export const MCHC_ADDRESS = '0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3' as const;

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
