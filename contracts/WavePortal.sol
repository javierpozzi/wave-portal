// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.4;

import "hardhat/console.sol";

contract WavePortal {
    uint256 totalWaves;
    mapping(address => uint256) userWaves;

    constructor() {
        console.log("WavePortal contract deployed!");
    }

    function wave() public {
        userWaves[msg.sender]++;
        totalWaves++;
        console.log("%s has waved %s times!", msg.sender, userWaves[msg.sender]);
    }

    function getTotalWaves() public view returns (uint256) {
        console.log("We have %d total waves!", totalWaves);
        return totalWaves;
    }
}