import { defineWorld } from "@latticexyz/world";

export default defineWorld({
  namespace: "mchSlg",
  tables: {
    // Singleton (id = 0) game-wide settings.
    GameConfig: {
      schema: {
        id: "uint8",
        startTime: "uint64",
        mapWidth: "uint8",
        mapHeight: "uint8",
        heroContract: "address",
      },
      key: ["id"],
    },

    // Tile entity components, keyed by packed coordinates (bytes32).
    Tile: { schema: { id: "bytes32", terrain: "uint8" }, key: ["id"] },
    TileOwner: { schema: { id: "bytes32", owner: "address" }, key: ["id"] },
    TileHealth: { schema: { id: "bytes32", value: "uint32" }, key: ["id"] },
    TileGarrison: { schema: { id: "bytes32", value: "uint32" }, key: ["id"] },
    TileProduction: { schema: { id: "bytes32", rate: "uint32" }, key: ["id"] },
    TileLastHarvest: { schema: { id: "bytes32", timestamp: "uint64" }, key: ["id"] },

    // Army entity (one per player for now).
    Army: {
      schema: {
        id: "bytes32",
        owner: "address",
        strength: "uint32",
        x: "int32",
        y: "int32",
      },
      key: ["id"],
    },

    // Per-player resources and hero binding.
    PlayerGold: { schema: { player: "address", value: "uint64" }, key: ["player"] },
    PlayerHero: {
      schema: { player: "address", heroContract: "address", tokenId: "uint256" },
      key: ["player"],
    },
  },
});
