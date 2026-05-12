// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Coords {
  function tileId(int32 x, int32 y) internal pure returns (bytes32) {
    return keccak256(abi.encode("tile", x, y));
  }

  function armyId(address owner) internal pure returns (bytes32) {
    return keccak256(abi.encode("army", owner));
  }

  function abs32(int32 v) internal pure returns (uint32) {
    return uint32(v < 0 ? -v : v);
  }
}
