// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import {
  Army, ArmyData,
  TileOwner, TileHealth, TileGarrison
} from "../codegen/index.sol";
import { Coords } from "../Coords.sol";

contract AttackSystem is System {
  error NotYourArmy();
  error NotAdjacent();
  error OwnTile();

  event Attacked(address indexed attacker, bytes32 indexed tile, bool win, uint32 attackerLoss, uint32 defenderLoss);

  function attack(int32 tx, int32 ty) public {
    address player = _msgSender();
    bytes32 aId = Coords.armyId(player);
    ArmyData memory a = Army.get(aId);
    if (a.owner != player) revert NotYourArmy();

    uint32 dist = Coords.abs32(tx - a.x) + Coords.abs32(ty - a.y);
    if (dist != 1) revert NotAdjacent();

    bytes32 tile = Coords.tileId(tx, ty);
    if (TileOwner.get(tile) == player) revert OwnTile();

    uint32 attackers = a.strength;
    uint32 defenders = TileGarrison.get(tile);

    // Pseudo-random disturbance from prevrandao. For production replace with VRF.
    uint256 r = uint256(keccak256(abi.encode(block.prevrandao, aId, tile))) % 100;
    bool win = uint256(attackers) * (50 + r) > uint256(defenders) * 100;

    uint32 attackerLoss;
    uint32 defenderLoss;

    if (win) {
      defenderLoss = defenders;
      attackerLoss = defenders > attackers ? attackers : defenders;
      uint32 surviving = attackers - attackerLoss;
      Army.setStrength(aId, surviving);
      TileOwner.set(tile, player);
      TileGarrison.set(tile, surviving / 2);
      Army.setStrength(aId, surviving - surviving / 2);
      TileHealth.set(tile, 100);
    } else {
      attackerLoss = attackers / 2;
      defenderLoss = attackers > defenders ? defenders : attackers;
      Army.setStrength(aId, attackers - attackerLoss);
      TileGarrison.set(tile, defenders - defenderLoss);
    }

    emit Attacked(player, tile, win, attackerLoss, defenderLoss);
  }
}
