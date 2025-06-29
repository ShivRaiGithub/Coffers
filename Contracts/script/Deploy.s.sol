// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Main} from "../src/Main.sol";
import {Asset} from "../src/Asset.sol";
import {Lending} from "../src/Lending.sol";
import {MockPriceFeed} from "../src/mocks/MockPriceFeed.sol";
import {Script, console} from "forge-std/Script.sol";

contract Deploy is Script {
    function setUp() public {}

    function run() public returns (Main, Asset, Lending) {
        vm.startBroadcast();

        uint256 chainId = block.chainid;
        address priceFeed;

        if (chainId == 11155111) {
            // Sepolia Testnet - ETH/USD Price Feed
            priceFeed = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
            console.log("Using Sepolia ETH/USD Price Feed:", priceFeed);
        }
        else {
            // Local/other networks - Deploy mock
            MockPriceFeed mock = new MockPriceFeed(3000e8); // $3000 per ETH
            priceFeed = address(mock);
            console.log("Deployed Mock Price Feed at:", priceFeed);
        }

        // Deploy contracts
        console.log("Deploying Asset contract...");
        Asset asset = new Asset();
        require(address(asset) != address(0), "Asset deployment failed");
        
        console.log("Deploying Lending contract...");
        Lending lending = new Lending();
        require(address(lending) != address(0), "Lending deployment failed");
        
        console.log("Deploying Main contract...");
        Main main = new Main(priceFeed, address(asset), address(lending));
        require(address(main) != address(0), "Main deployment failed");

        // Set up contract relationships
        console.log("Setting up contract relationships...");
        asset.setLendingContract(address(lending));
        asset.setMainContract(address(main));
        lending.setNftContract(address(asset));
        lending.setMainContract(address(main));

        // Log deployment addresses
        console.log("=== DEPLOYMENT SUCCESSFUL ===");
        console.log("Chain ID:", chainId);
        console.log("Asset deployed at:", address(asset));
        console.log("Lending deployed at:", address(lending));
        console.log("Main deployed at:", address(main));
        console.log("Price Feed used:", priceFeed);
        
        // Verify price feed is working
        console.log("Testing price feed...");
        try main.getLatestPrice() returns (int256 price) {
            console.log("Current ETH/USD price:", uint256(price));
        } catch {
            console.log("Warning: Price feed test failed");
        }

        vm.stopBroadcast();
        return (main, asset, lending);
    }
}