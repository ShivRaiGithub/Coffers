// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IMainContract {
    function checkAndPrepareLiquidations() external returns (uint256[] memory);
}

/**
 * @title LiquidationAutomation
 * @dev Chainlink Automation contract that calls checkAndPrepareLiquidations on Main contract every 24 hours
 */
contract LiquidationAutomation is AutomationCompatibleInterface, Ownable {
    // Main contract interface
    IMainContract public immutable mainContract;
    
    // Events
    event LiquidationCheckPerformed(
        uint256 timestamp, 
        uint256[] liquidatableTokens,
        address triggeredBy
    );
    
    constructor(address _mainContract) Ownable(msg.sender) {
        require(_mainContract != address(0), "Invalid main contract address");
        mainContract = IMainContract(_mainContract);
    }

    function checkUpkeep(bytes calldata /* checkData */) 
        external 
        override 
        returns (bool upkeepNeeded, bytes memory performData) 
    {
        // Always return true since Chainlink will handle the scheduling via CRON
        upkeepNeeded = true;
        performData = "";
    }

    function performUpkeep(bytes calldata /* performData */) external override {        
        // Call the main contract's liquidation check function
        uint256[] memory liquidatableTokens = mainContract.checkAndPrepareLiquidations();
        
        emit LiquidationCheckPerformed(block.timestamp, liquidatableTokens, msg.sender);
    }

    function getMainContractAddress() external view returns (address) {
        return address(mainContract);
    }
}