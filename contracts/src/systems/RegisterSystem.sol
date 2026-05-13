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

  function register(uint256 heroTokenId, int32 spawnX, int32 spawnY) public {
    address player = _msgSender();
    bytes32 armyKey = Coords.armyId(player);
    if (Army.getStrength(armyKey) > 0) revert AlreadyRegistered();

    GameConfigData memory cfg = GameConfig.get(0);
    if (
      spawnX < 0 || spawnY < 0 ||
      uint32(spawnX) >= uint32(cfg.mapWidth) ||
      uint32(spawnY) >= uint32(cfg.mapHeight)
    ) revert OutOfBounds();

    // Hero NFT ownership is enforced only when a hero contract is configured
    // (set on testnet/mainnet via PostDeploy). Address(0) = "dev mode".
    if (cfg.heroContract != address(0)) {
      if (IERC721Like(cfg.heroContract).ownerOf(heroTokenId) != player) revert NotHeroOwner();
      PlayerHero.set(player, cfg.heroContract, heroTokenId);
    }

    PlayerGold.set(player, 100);
    Army.set(armyKey, player, 100, spawnX, spawnY);
  }
}
