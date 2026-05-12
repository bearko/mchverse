// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Army, ArmyData, GameConfig, GameConfigData } from "../codegen/index.sol";
import { Coords } from "../Coords.sol";

contract MoveSystem is System {
  error NotYourArmy();
  error OutOfBounds();
  error TooFar();

  function move(int32 nx, int32 ny) public {
    address player = _msgSender();
    bytes32 aId = Coords.armyId(player);
    ArmyData memory a = Army.get(aId);
    if (a.owner != player) revert NotYourArmy();

    GameConfigData memory cfg = GameConfig.get(0);
    if (
      nx < 0 || ny < 0 ||
      uint32(nx) >= uint32(cfg.mapWidth) ||
      uint32(ny) >= uint32(cfg.mapHeight)
    ) revert OutOfBounds();

    uint32 dist = Coords.abs32(nx - a.x) + Coords.abs32(ny - a.y);
    if (dist != 1) revert TooFar();

    Army.setX(aId, nx);
    Army.setY(aId, ny);
  }
}
