// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GhostHandshake} from "../contracts/GhostHandshake.sol";

/// Frontend must use:
/// solidityPackedKeccak256(["string","bytes32"], [word, salt])
/// == keccak256(abi.encodePacked(word, salt))
contract HashTest is Test {
    GhostHandshake gh;
    address a = address(0xA11CE);
    address b = address(0xB0B);

    function setUp() public {
        gh = new GhostHandshake();
        vm.deal(a, 1 ether);
        vm.deal(b, 1 ether);
    }

    function testPackedStringThenBytes32() public pure {
        string memory word = "canal";
        bytes32 salt = hex"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        bytes32 packed = keccak256(abi.encodePacked(word, salt));
        bytes32 concat_ = keccak256(bytes.concat(bytes(word), abi.encodePacked(salt)));
        assertEq(packed, concat_, "packed word||salt");
        // NOT the same as abi.encode (length-prefixed). Do not "fix" to encode.
        bytes32 encoded = keccak256(abi.encode(word, salt));
        assertTrue(packed != encoded, "encode != packed");
    }

    function testTwoPlayersMatchOnCanal() public {
        string memory word = "canal";
        bytes32 saltA = bytes32(uint256(11));
        bytes32 saltB = bytes32(uint256(22));
        bytes32 ha = keccak256(abi.encodePacked(word, saltA));
        bytes32 hb = keccak256(abi.encodePacked(word, saltB));

        vm.prank(a);
        gh.commit(ha);
        vm.prank(b);
        gh.commit(hb);

        vm.prank(a);
        gh.reveal(word, saltA);
        vm.prank(b);
        gh.reveal(word, saltB);

        assertEq(gh.totalPairs(), 1);
        assertEq(gh.handshakeCount(a), 1);
        assertEq(gh.handshakeCount(b), 1);
        GhostHandshake.Pair memory p = gh.getPair(0);
        assertEq(p.a, a);
        assertEq(p.b, b);
        assertEq(p.wordHash, keccak256(bytes(word)));
    }

    function testWrongWordFailsReveal() public {
        bytes32 salt = bytes32(uint256(7));
        vm.prank(a);
        gh.commit(keccak256(abi.encodePacked("canal", salt)));
        vm.prank(a);
        vm.expectRevert(GhostHandshake.BadReveal.selector);
        gh.reveal("fog", salt);
    }
}
