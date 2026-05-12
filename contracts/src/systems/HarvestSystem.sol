// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import {
  TileOwner, TileProduction, TileLastHarvest,
  PlayerGold
} from "../codegen/index.sol";
import { Coords } from "../Coords.sol";

contract HarvestSystem is System {
  error NotYourTile();

  function harvest(int32 tx, int32 ty) public {
    address player = _msgSender();
    bytes32 tile = Coords.tileId(tx, ty);
    if (TileOwner.get(tile) != player) revert NotYourTile();

    uint64 last = TileLastHarvest.get(tile);
    uint64 nowTs = uint64(block.timestamp);
    if (last == 0) last = nowTs;
    uint64 elapsed = nowTs - last;
    uint64 rate = uint64(TileProduction.get(tile));
    uint64 accrued = rate * elapsed;

    if (accrued > 0) {
      PlayerGold.set(player, PlayerGold.get(player) + accrued);
    }
    TileLastHarvest.set(tile, nowTs);
  }
}
