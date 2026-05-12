// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import {
  GameConfig,
  Tile,
  TileHealth,
  TileGarrison,
  TileProduction,
  TileLastHarvest
} from "../src/codegen/index.sol";
import { Coords } from "../src/Coords.sol";

// MUD invokes this after deployment.
contract PostDeploy is Script {
  function run(address worldAddress) external {
    uint256 deployerPk = vm.envUint("PRIVATE_KEY");
    address heroContract = vm.envOr("MCHH_ADDRESS", address(0));
    uint8 width = 10;
    uint8 height = 10;

    vm.startBroadcast(deployerPk);

    GameConfig.set(0, uint64(block.timestamp), width, height, heroContract);

    for (int32 x = 0; x < int32(uint32(width)); x++) {
      for (int32 y = 0; y < int32(uint32(height)); y++) {
        bytes32 id = Coords.tileId(x, y);
        Tile.set(id, 0);
        TileHealth.set(id, 100);
        TileGarrison.set(id, 50);
        TileProduction.set(id, 1);
        TileLastHarvest.set(id, uint64(block.timestamp));
      }
    }

    vm.stopBroadcast();

    console.log("World deployed at", worldAddress);
    console.log("Map initialized", uint32(width), uint32(height));
  }
}
