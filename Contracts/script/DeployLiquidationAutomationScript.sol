// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/LiquidationAutomation.sol";

contract DeployLiquidationAutomationScript is Script {
    // Replace with the deployed Main contract address on Sepolia
    address constant MAIN_CONTRACT_ADDRESS = 0x32116049E79985D6eF2D8819478D7939A0a38F2e;

    function setUp() public {}

    function run() public {
        vm.startBroadcast(msg.sender);

        // Deploy the LiquidationAutomation contract
        LiquidationAutomation automation = new LiquidationAutomation(MAIN_CONTRACT_ADDRESS);

        vm.stopBroadcast();

        console.log("LiquidationAutomation deployed at:", address(automation));
    }
}
