// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import {
  GameConfig,
  GameConfigData,
  PlayerHero,
  PlayerGold,
  Army,
  Tile
} from "../codegen/index.sol";
import { IERC721Like } from "../IERC721Like.sol";
import { Coords } from "../Coords.sol";

contract RegisterSystem is System {
  error AlreadyRegistered();
  error WrongHeroContract();
  error NotHeroOwner();
  error OutOfBounds();
  error SpawnOccupied();

  function register(uint256 heroTokenId, int32 spawnX, int32 spawnY) public {
    address player = _msgSender();
    if (PlayerHero.getTokenId(player) != 0) revert AlreadyRegistered();

    GameConfigData memory cfg = GameConfig.get(0);
    if (
      spawnX < 0 || spawnY < 0 ||
      uint32(spawnX) >= uint32(cfg.mapWidth) ||
      uint32(spawnY) >= uint32(cfg.mapHeight)
    ) revert OutOfBounds();

    if (IERC721Like(cfg.heroContract).ownerOf(heroTokenId) != player) revert NotHeroOwner();

    bytes32 spawnTile = Coords.tileId(spawnX, spawnY);
    if (Tile.getTerrain(spawnTile) == 0) {
      // ok
    }

    PlayerHero.set(player, cfg.heroContract, heroTokenId);
    PlayerGold.set(player, 100);

    bytes32 aId = Coords.armyId(player);
    Army.set(aId, player, 100, spawnX, spawnY);
  }
}
