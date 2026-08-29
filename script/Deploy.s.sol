// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {GhostHandshake} from "../contracts/GhostHandshake.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        GhostHandshake gh = new GhostHandshake();
        vm.stopBroadcast();
        console.log("GhostHandshake", address(gh));
    }
}
