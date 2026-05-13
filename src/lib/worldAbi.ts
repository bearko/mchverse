// Minimal ABI exposing the namespaced system functions on the MUD World.
// MUD prefixes each function with `<namespace>__`; our namespace is `mchSlg`.
export const worldAbi = [
  {
    type: 'function',
    name: 'mchSlg__register',
    inputs: [
      { name: 'heroTokenId', type: 'uint256' },
      { name: 'spawnX', type: 'int32' },
      { name: 'spawnY', type: 'int32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'mchSlg__move',
    inputs: [
      { name: 'nx', type: 'int32' },
      { name: 'ny', type: 'int32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'mchSlg__attack',
    inputs: [
      { name: 'tx', type: 'int32' },
      { name: 'ty', type: 'int32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'mchSlg__harvest',
    inputs: [
      { name: 'tx', type: 'int32' },
      { name: 'ty', type: 'int32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'mchSlg__getConfig',
    inputs: [],
    outputs: [
      { name: 'startTime', type: 'uint64' },
      { name: 'mapWidth', type: 'uint8' },
      { name: 'mapHeight', type: 'uint8' },
      { name: 'heroContract', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'mchSlg__getTileInfo',
    inputs: [
      { name: 'x', type: 'int32' },
      { name: 'y', type: 'int32' },
    ],
    outputs: [
      { name: 'terrain', type: 'uint8' },
      { name: 'owner', type: 'address' },
      { name: 'health', type: 'uint32' },
      { name: 'garrison', type: 'uint32' },
      { name: 'production', type: 'uint32' },
      { name: 'lastHarvest', type: 'uint64' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'mchSlg__getArmyInfo',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'strength', type: 'uint32' },
      { name: 'x', type: 'int32' },
      { name: 'y', type: 'int32' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'mchSlg__getPlayerGold',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ type: 'uint64' }],
    stateMutability: 'view',
  },
] as const;
