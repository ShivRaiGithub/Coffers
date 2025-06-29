// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {GetActivity} from "../src/GetActivity.sol";
import {Main} from "../src/Main.sol";
import {Script, console} from "forge-std/Script.sol";

/**
 * @title DeployGetActivity
 * @notice Deployment script for GetActivity contract on Sepolia testnet
 * @dev This script deploys the GetActivity contract which integrates with Chainlink Functions
 *      to fetch Twitter handle data and calculate activity points
 */
contract DeployGetActivity is Script {
    // Sepolia testnet addresses
    address constant SEPOLIA_FUNCTIONS_ROUTER = 0xb83E47C2bC239B3bf370bc41e1459A34b41238D0;
    
    // Expected Main contract address (update this after Main contract deployment)
    address constant MAIN_CONTRACT_ADDRESS = 0x32116049E79985D6eF2D8819478D7939A0a38F2e;
    
    function setUp() public {}

    function run() public returns (GetActivity) {
        uint256 chainId = block.chainid;
        
        // Verify we're on Sepolia testnet
        require(chainId == 11155111, "This script is only for Sepolia testnet (Chain ID: 11155111)");
        
        console.log("=== DEPLOYING GETACTIVITY CONTRACT ===");
        console.log("Chain ID:", chainId);
        console.log("Functions Router:", SEPOLIA_FUNCTIONS_ROUTER);
        console.log("Main Contract:", MAIN_CONTRACT_ADDRESS);
        
        // Verify Main contract exists (optional check)
        if (MAIN_CONTRACT_ADDRESS.code.length == 0) {
            console.log("WARNING: Main contract not found at specified address");
            console.log("Make sure to deploy Main contract first or update MAIN_CONTRACT_ADDRESS");
        } else {
            console.log("Main contract verified at:", MAIN_CONTRACT_ADDRESS);
        }

        vm.startBroadcast();

        // Deploy GetActivity contract
        console.log("Deploying GetActivity contract...");
        GetActivity getActivity = new GetActivity();
        
        require(address(getActivity) != address(0), "GetActivity deployment failed");

        vm.stopBroadcast();

        // Log deployment information
        console.log("=== DEPLOYMENT SUCCESSFUL ===");
        console.log("GetActivity deployed at:", address(getActivity));
        console.log("");
        console.log("=== CONTRACT CONFIGURATION ===");
        console.log("Functions Router:", SEPOLIA_FUNCTIONS_ROUTER);
        console.log("DON ID: fun-ethereum-sepolia-1");
        console.log("Callback Gas Limit: 300,000");
        console.log("Main Contract:", getActivity.getMainContractAddress());
        console.log("");
        return getActivity;
    }

    /**
     * @notice Helper function to check if Main contract is properly deployed
     * @param mainAddr Address of the Main contract to check
     */
    function verifyMainContract(address mainAddr) public view returns (bool) {
        if (mainAddr.code.length == 0) {
            return false;
        }
        
        try Main(mainAddr).getLatestPrice() returns (int256) {
            return true;
        } catch {
            return false;
        }
    }

    /**
     * @notice Get deployment information for reference
     */
    function getDeploymentInfo() public pure returns (
        address functionsRouter,
        bytes32 donId,
        uint32 callbackGasLimit,
        address mainContract
    ) {
        return (
            SEPOLIA_FUNCTIONS_ROUTER,
            0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000, // fun-ethereum-sepolia-1
            300000,
            MAIN_CONTRACT_ADDRESS
        );
    }
}
