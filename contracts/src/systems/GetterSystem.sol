// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import {
  GameConfig,
  Tile, TileOwner, TileHealth, TileGarrison, TileProduction, TileLastHarvest,
  Army, ArmyData,
  PlayerGold, PlayerHero, PlayerHeroData
} from "../codegen/index.sol";
import { Coords } from "../Coords.sol";

contract GetterSystem is System {
  function getConfig()
    external
    view
    returns (uint64 startTime, uint8 mapWidth, uint8 mapHeight, address heroContract)
  {
    return (
      GameConfig.getStartTime(0),
      GameConfig.getMapWidth(0),
      GameConfig.getMapHeight(0),
      GameConfig.getHeroContract(0)
    );
  }

  function getTileInfo(int32 x, int32 y)
    external
    view
    returns (
      uint8 terrain,
      address owner,
      uint32 health,
      uint32 garrison,
      uint32 production,
      uint64 lastHarvest
    )
  {
    bytes32 id = Coords.tileId(x, y);
    return (
      Tile.getTerrain(id),
      TileOwner.get(id),
      TileHealth.get(id),
      TileGarrison.get(id),
      TileProduction.get(id),
      TileLastHarvest.get(id)
    );
  }

  function getArmyInfo(address player)
    external
    view
    returns (address owner, uint32 strength, int32 x, int32 y)
  {
    ArmyData memory a = Army.get(Coords.armyId(player));
    return (a.owner, a.strength, a.x, a.y);
  }

  function getPlayerGold(address player) external view returns (uint64) {
    return PlayerGold.get(player);
  }

  function getPlayerHero(address player)
    external
    view
    returns (address heroContract, uint256 tokenId)
  {
    PlayerHeroData memory h = PlayerHero.get(player);
    return (h.heroContract, h.tokenId);
  }
}
