// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Main.sol";
import "../src/Asset.sol";
import "../src/Lending.sol";
import "../src/mocks/MockPriceFeed.sol";
import "../script/Deploy.s.sol";

contract NFTMarketplaceTest is Test {
    Main public main;
    Asset public asset;
    Lending public lending;
    MockPriceFeed public mockFeed;
    
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");
    address public david = makeAddr("david");
    
    string constant TOKEN_URI_1 = "https://example.com/token/1";
    string constant TOKEN_URI_2 = "https://example.com/token/2";
    string constant TOKEN_URI_3 = "https://example.com/token/3";
    
    // USD amounts in 8 decimals (e.g., $100.50 = 10050000000)
    uint256 constant USD_100 = 100_00000000; // $100.00
    uint256 constant USD_200 = 200_00000000; // $200.00
    uint256 constant USD_300 = 300_00000000; // $300.00
    uint256 constant USD_500 = 500_00000000; // $500.00
    uint256 constant USD_1000 = 1000_00000000; // $1000.00
    uint256 constant USD_2000 = 2000_00000000; // $2000.00
    uint256 constant USD_3000 = 3000_00000000; // $3000.00
    
    function setUp() public {
        Deploy deploy = new Deploy();
        (main, asset, lending) = deploy.run();

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(charlie, 100 ether);
        vm.deal(david, 100 ether);
    }
    
    // ========== MINTING TESTS ==========
    
    function testMintNFT() public {
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        vm.stopPrank();
        
        assertEq(tokenId, 0);
        assertEq(asset.ownerOf(tokenId), alice);
        assertEq(asset.tokenURI(tokenId), TOKEN_URI_1);
        assertEq(asset.totalMinted(), 1);
    }
    
    function testMultipleUsersMinting() public {
        // Alice mints token 0
        vm.prank(alice);
        uint256 tokenId1 = main.mint(TOKEN_URI_1);
        
        // Bob mints token 1
        vm.prank(bob);
        uint256 tokenId2 = main.mint(TOKEN_URI_2);
        
        // Charlie mints token 2
        vm.prank(charlie);
        uint256 tokenId3 = main.mint(TOKEN_URI_3);
        
        assertEq(tokenId1, 0);
        assertEq(tokenId2, 1);
        assertEq(tokenId3, 2);
        
        assertEq(asset.ownerOf(0), alice);
        assertEq(asset.ownerOf(1), bob);
        assertEq(asset.ownerOf(2), charlie);
        
        assertEq(asset.totalMinted(), 3);
    }
    
    // ========== SALES TESTS ==========
    
    function testCreateSale() public {
        // Alice mints and creates sale
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.createSale(tokenId, USD_100); // $100 USD
        vm.stopPrank();
        
        (address seller, uint256 priceUSD, bool active) = main.getSaleInfo(tokenId);
        
        assertEq(seller, alice);
        assertEq(priceUSD, USD_100);
        assertTrue(active);
        
        uint256[] memory tokensForSale = main.getTokensForSale();
        assertEq(tokensForSale.length, 1);
        assertEq(tokensForSale[0], tokenId);
    }
    
    function testPurchaseNFT() public {
        // Alice mints and creates sale
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.createSale(tokenId, USD_100); // $100 USD
        vm.stopPrank();
        
        uint256 aliceBalanceBefore = alice.balance;
        
        // Get the ETH price for the USD amount
        (uint256 ethPrice, ) = main.getSaleETHPrice(tokenId);
        
        // Bob purchases the NFT
        vm.prank(bob);
        main.purchaseNFT{value: ethPrice}(tokenId);
        
        // Check ownership transfer
        assertEq(asset.ownerOf(tokenId), bob);
        
        // Check payment transfer (should be close to ethPrice)
        assertGt(alice.balance, aliceBalanceBefore);
        
        // Check sale is cleaned up
        (, , bool active) = main.getSaleInfo(tokenId);
        assertFalse(active);
        
        uint256[] memory tokensForSale = main.getTokensForSale();
        assertEq(tokensForSale.length, 0);
    }
    
    function testCannotBuyOwnNFT() public {
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.createSale(tokenId, USD_100);
        
        (uint256 ethPrice, ) = main.getSaleETHPrice(tokenId);
        vm.expectRevert("Cannot buy own NFT");
        main.purchaseNFT{value: ethPrice}(tokenId);
        vm.stopPrank();
    }
    
    function testCannotPurchaseWithWrongPrice() public {
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.createSale(tokenId, USD_100);
        vm.stopPrank();
        
        (uint256 ethPrice, ) = main.getSaleETHPrice(tokenId);
        
        vm.prank(bob);
        vm.expectRevert("Payment too low");
        main.purchaseNFT{value: ethPrice / 2}(tokenId); // Pay half the required amount
    }
    
    function testCancelSale() public {
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.createSale(tokenId, USD_100);
        main.cancelSale(tokenId);
        vm.stopPrank();
        
        (, , bool active) = main.getSaleInfo(tokenId);
        assertFalse(active);
    }
    
    function testCannotCreateSaleForNonOwnedToken() public {
        vm.prank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        
        vm.prank(bob);
        vm.expectRevert("Not token owner");
        main.createSale(tokenId, USD_100);
    }
    
    // ========== LENDING TESTS ==========
    
    function testRequestLoan() public {
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.requestLoan(tokenId, USD_100, 30); // $100 USD, 30 days
        vm.stopPrank();
        
        (
            uint256 loanAmount,
            uint256 interestAmount,
            uint256 deadline,
            address borrower,
            address lender,
            uint256 startTime,
            bool active
        ) = main.getLoanInfo(tokenId);
        
        assertTrue(active);
        assertEq(borrower, alice);
        assertEq(lender, address(0)); // Not funded yet
        assertEq(startTime, 0); // Not started yet
        assertGt(loanAmount, 0); // Should be converted from USD to ETH
        assertGt(interestAmount, 0); // Should have interest
    }
    
    function testFundLoan() public {
        // Alice requests loan
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.requestLoan(tokenId, USD_100, 30); // $100 USD, 30 days
        vm.stopPrank();
        
        // Get the required ETH amount for funding
        (uint256 loanAmountETH, , , , , , ) = main.getLoanInfo(tokenId);
        
        uint256 aliceBalanceBefore = alice.balance;
        
        // Bob funds the loan
        vm.prank(bob);
        main.fundLoan{value: loanAmountETH}(tokenId);
        
        // Check loan is funded
        (, , , , address lender, uint256 startTime,) = main.getLoanInfo(tokenId);
        assertEq(lender, bob);
        assertEq(startTime, block.timestamp);
        
        // Check Alice received the loan
        assertEq(alice.balance, aliceBalanceBefore + loanAmountETH);
        
        // Check NFT is transferred to lending contract
        assertEq(asset.ownerOf(tokenId), address(lending));
    }
    
    function testRepayLoan() public {
        // Alice requests and Bob funds loan
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.requestLoan(tokenId, USD_100, 30); // $100 USD, 30 days
        vm.stopPrank();
        
        // Get the required ETH amount for funding
        (uint256 loanAmountETH, , , , , , ) = main.getLoanInfo(tokenId);
        
        vm.prank(bob);
        main.fundLoan{value: loanAmountETH}(tokenId);
        
        uint256 bobBalanceBefore = bob.balance;
        uint256 totalRepayment = main.getTotalRepaymentAmount(tokenId);
        
        // Alice repays loan
        vm.prank(alice);
        main.repayLoan{value: totalRepayment}(tokenId);
        
        // Check NFT is returned to Alice
        assertEq(asset.ownerOf(tokenId), alice);
        
        // Check Bob received repayment
        assertEq(bob.balance, bobBalanceBefore + totalRepayment);
        
        // Check loan is cleaned up
        (, , , , , , bool active) = main.getLoanInfo(tokenId);
        assertFalse(active);
    }
    
    function testCannotRepayWithInsufficientAmount() public {
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.requestLoan(tokenId, USD_100, 30); // $100 USD, 30 days
        vm.stopPrank();
        
        // Get the required ETH amount for funding
        (uint256 loanAmountETH, , , , , , ) = main.getLoanInfo(tokenId);
        
        vm.prank(bob);
        main.fundLoan{value: loanAmountETH}(tokenId);
        
        vm.prank(alice);
        vm.expectRevert("Insufficient repayment");
        main.repayLoan{value: loanAmountETH}(tokenId); // Should be loanAmount + interest
    }
    
    function testLiquidateExpiredLoan() public {
        // Alice requests and Bob funds loan
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.requestLoan(tokenId, USD_100, 30); // $100 USD, 30 days
        vm.stopPrank();
        
        // Get the required ETH amount for funding
        (uint256 loanAmountETH, , , , , , ) = main.getLoanInfo(tokenId);
        
        vm.prank(bob);
        main.fundLoan{value: loanAmountETH}(tokenId);
        
        // Fast forward time past deadline
        vm.warp(block.timestamp + 31 days);
        
        // Anyone can liquidate
        vm.prank(charlie);
        main.liquidateAsset(tokenId);
        
        // Check NFT is transferred to lender (Bob)
        assertEq(asset.ownerOf(tokenId), bob);
        
        // Check loan is cleaned up
        (, , , , , , bool active) = main.getLoanInfo(tokenId);
        assertFalse(active);
    }
    
    function testCannotLiquidateNonExpiredLoan() public {
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.requestLoan(tokenId, USD_100, 30); // $100 USD, 30 days
        vm.stopPrank();
        
        // Get the required ETH amount for funding
        (uint256 loanAmountETH, , , , , , ) = main.getLoanInfo(tokenId);
        
        vm.prank(bob);
        main.fundLoan{value: loanAmountETH}(tokenId);
        
        // Try to liquidate before expiry
        vm.prank(charlie);
        vm.expectRevert("Loan not expired");
        main.liquidateAsset(tokenId);
    }
    
    function testCancelLoanRequest() public {
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.requestLoan(tokenId, USD_100, 30); // $100 USD, 30 days
        main.cancelLoanRequest(tokenId);
        vm.stopPrank();
        
        (, , , , , , bool active) = main.getLoanInfo(tokenId);
        assertFalse(active);
    }
    
    function testCannotCancelFundedLoan() public {
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.requestLoan(tokenId, USD_100, 30); // $100 USD, 30 days
        vm.stopPrank();
        
        // Get the required ETH amount for funding
        (uint256 loanAmountETH, , , , , , ) = main.getLoanInfo(tokenId);
        
        vm.prank(bob);
        main.fundLoan{value: loanAmountETH}(tokenId);
        
        vm.prank(alice);
        vm.expectRevert("Loan already funded");
        main.cancelLoanRequest(tokenId);
    }
    
    // ========== CHAINLINK AUTOMATION TESTS ==========
    
    function testCheckAndPrepareLiquidations() public {
        // Create multiple loans
        vm.startPrank(alice);
        uint256 tokenId1 = main.mint(TOKEN_URI_1);
        uint256 tokenId2 = main.mint(TOKEN_URI_2);
        main.requestLoan(tokenId1, USD_100, 30); // $100 USD, 30 days
        main.requestLoan(tokenId2, USD_200, 60); // $200 USD, 60 days
        vm.stopPrank();
        
        // Get required ETH amounts for funding
        (uint256 loanAmount1ETH, , , , , , ) = main.getLoanInfo(tokenId1);
        (uint256 loanAmount2ETH, , , , , , ) = main.getLoanInfo(tokenId2);
        
        // Fund loans
        vm.prank(bob);
        main.fundLoan{value: loanAmount1ETH}(tokenId1);
        
        vm.prank(charlie);
        main.fundLoan{value: loanAmount2ETH}(tokenId2);
        
        // Fast forward time to expire first loan only
        vm.warp(block.timestamp + 31 days);
        
        // Check liquidations
        uint256[] memory liquidatable = main.checkAndPrepareLiquidations();
        
        // Should have liquidated tokenId1 automatically
        assertEq(liquidatable.length, 1);
        assertEq(liquidatable[0], tokenId1);
        
        // Check tokenId1 was liquidated (transferred to Bob)
        assertEq(asset.ownerOf(tokenId1), bob);
        
        // Check tokenId2 is still with lending contract (not expired)
        assertEq(asset.ownerOf(tokenId2), address(lending));
    }
    
    function testIsLoanExpired() public {
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.requestLoan(tokenId, USD_100, 30); // $100 USD, 30 days
        vm.stopPrank();
        
        // Get the required ETH amount for funding
        (uint256 loanAmountETH, , , , , , ) = main.getLoanInfo(tokenId);
        
        vm.prank(bob);
        main.fundLoan{value: loanAmountETH}(tokenId);
        
        // Before expiry
        assertFalse(main.isLoanExpired(tokenId));
        
        // After expiry
        vm.warp(block.timestamp + 31 days);
        assertTrue(main.isLoanExpired(tokenId));
    }
    
    // ========== INTEGRATION TESTS ==========
    
    function testCannotSellTokenUsedAsCollateral() public {
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.requestLoan(tokenId, USD_100, 30); // $100 USD, 30 days
        
        vm.expectRevert("Token is used as collateral");
        main.createSale(tokenId, USD_200); // $200 USD
        vm.stopPrank();
    }
    
    function testCannotRequestLoanForTokenOnSale() public {
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.createSale(tokenId, USD_200); // $200 USD
        
        vm.expectRevert("Token is for sale");
        main.requestLoan(tokenId, USD_100, 30); // $100 USD, 30 days
        vm.stopPrank();
    }
    
    function testMultipleActiveSales() public {
        // Alice creates multiple sales
        vm.startPrank(alice);
        uint256 tokenId1 = main.mint(TOKEN_URI_1);
        uint256 tokenId2 = main.mint(TOKEN_URI_2);
        main.createSale(tokenId1, USD_100); // $100 USD
        main.createSale(tokenId2, USD_200); // $200 USD
        vm.stopPrank();
        
        // Bob creates a sale
        vm.startPrank(bob);
        uint256 tokenId3 = main.mint(TOKEN_URI_3);
        main.createSale(tokenId3, USD_300); // $300 USD
        vm.stopPrank();
        
        (
            uint256[] memory tokenIds,
            address[] memory sellers,
            uint256[] memory pricesUSD,
            uint256[] memory pricesETH
        ) = main.getAllActiveSales();
        
        assertEq(tokenIds.length, 3);
        assertEq(sellers.length, 3);
        assertEq(pricesUSD.length, 3);
        assertEq(pricesETH.length, 3);
        
        // Check all sales are present
        bool found1 = false;
        bool found2 = false;
        bool found3 = false;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (tokenIds[i] == tokenId1) found1 = true;
            if (tokenIds[i] == tokenId2) found2 = true;
            if (tokenIds[i] == tokenId3) found3 = true;
        }
        assertTrue(found1 && found2 && found3);
    }
    
    function testMultipleActiveLoans() public {
        // Create multiple loan requests
        vm.startPrank(alice);
        uint256 tokenId1 = main.mint(TOKEN_URI_1);
        uint256 tokenId2 = main.mint(TOKEN_URI_2);
        main.requestLoan(tokenId1, USD_100, 30); // $100 USD, 30 days
        main.requestLoan(tokenId2, USD_200, 60); // $200 USD, 60 days
        vm.stopPrank();
        
        vm.startPrank(bob);
        uint256 tokenId3 = main.mint(TOKEN_URI_3);
        main.requestLoan(tokenId3, USD_300, 90); // $300 USD, 90 days
        vm.stopPrank();
        
        // Fund first loan
        (uint256 loanAmountETH, , , , , , ) = main.getLoanInfo(tokenId1);
        vm.prank(charlie);
        main.fundLoan{value: loanAmountETH}(tokenId1);
        
        (
            uint256[] memory tokenIds,
            address[] memory borrowers,
            uint256[] memory amounts,
            uint256[] memory deadlines,
            bool[] memory funded
        ) = main.getAllActiveLoans();
        
        assertEq(tokenIds.length, 3);
        assertEq(borrowers.length, 3);
        assertEq(amounts.length, 3);
        assertEq(deadlines.length, 3);
        assertEq(funded.length, 3);
        
        // Check funding status
        bool foundFunded = false;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (tokenIds[i] == tokenId1) {
                assertTrue(funded[i]);
                foundFunded = true;
            } else {
                assertFalse(funded[i]);
            }
        }
        assertTrue(foundFunded);
    }
    
    // ========== VIEW FUNCTION TESTS ==========
    
    function testGetTokensOfOwner() public {
        vm.startPrank(alice);
        uint256 tokenId1 = main.mint(TOKEN_URI_1);
        uint256 tokenId2 = main.mint(TOKEN_URI_2);
        vm.stopPrank();
        
        vm.prank(bob);
        uint256 tokenId3 = main.mint(TOKEN_URI_3);
        
        uint256[] memory aliceTokens = main.getTokensOfOwner(alice);
        uint256[] memory bobTokens = main.getTokensOfOwner(bob);
        
        assertEq(aliceTokens.length, 2);
        assertEq(bobTokens.length, 1);
        assertEq(bobTokens[0], tokenId3);
    }
    
    function testGetAllTokens() public {
        vm.prank(alice);
        main.mint(TOKEN_URI_1);
        
        vm.prank(bob);
        main.mint(TOKEN_URI_2);
        
        vm.prank(charlie);
        main.mint(TOKEN_URI_3);
        
        uint256[] memory allTokens = main.getAllTokens();
        assertEq(allTokens.length, 3);
        assertEq(allTokens[0], 0);
        assertEq(allTokens[1], 1);
        assertEq(allTokens[2], 2);
    }
    
    // ========== EDGE CASES ==========
    
    function testRepayLoanWithExcessAmount() public {
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.requestLoan(tokenId, USD_100, 30); // $100 USD, 30 days
        vm.stopPrank();
        
        // Get the required ETH amount for funding
        (uint256 loanAmountETH, , , , , , ) = main.getLoanInfo(tokenId);
        
        vm.prank(bob);
        main.fundLoan{value: loanAmountETH}(tokenId);
        
        uint256 aliceBalanceBefore = alice.balance;
        uint256 totalRepayment = main.getTotalRepaymentAmount(tokenId);
        
        // Alice repays with excess amount
        vm.prank(alice);
        main.repayLoan{value: totalRepayment + 0.4 ether}(tokenId);
        
        // Check Alice got the excess back (should have paid only totalRepayment)
        assertEq(alice.balance, aliceBalanceBefore - totalRepayment);
        
        // Check NFT is returned
        assertEq(asset.ownerOf(tokenId), alice);
    }
    
    function testCannotFundOwnLoan() public {
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.requestLoan(tokenId, USD_100, 30); // $100 USD, 30 days
        
        // Get the required ETH amount for funding
        (uint256 loanAmountETH, , , , , , ) = main.getLoanInfo(tokenId);
        
        vm.expectRevert("Cannot fund own loan");
        main.fundLoan{value: loanAmountETH}(tokenId);
        vm.stopPrank();
    }
    
    function testCannotRepayAfterExpiry() public {
        vm.startPrank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        main.requestLoan(tokenId, USD_100, 30); // $100 USD, 30 days
        vm.stopPrank();
        
        // Get the required ETH amount for funding
        (uint256 loanAmountETH, , , , , , ) = main.getLoanInfo(tokenId);
        
        vm.prank(bob);
        main.fundLoan{value: loanAmountETH}(tokenId);
        
        // Fast forward past deadline
        vm.warp(block.timestamp + 31 days);
        
        uint256 totalRepayment = main.getTotalRepaymentAmount(tokenId);
        
        vm.prank(alice);
        vm.expectRevert("Loan expired");
        main.repayLoan{value: totalRepayment}(tokenId);
    }

    // ========== ACTIVITY POINTS TESTS ==========
    
    function testActivityPointsForNFTSale() public {
        // Alice mints an NFT
        vm.prank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_1);
        
        // Alice creates a sale
        vm.prank(alice);
        main.createSale(tokenId, USD_500); // $500 USD
        
        // Check initial activity points (should be 0)
        assertEq(main.getUserActivityPoints(alice), 0);
        assertEq(main.getUserActivityPoints(bob), 0);
        
        // Get the current ETH price for the sale
        (uint256 ethPrice, ) = main.getSaleETHPrice(tokenId);
        
        // Bob purchases the NFT
        vm.prank(bob);
        main.purchaseNFT{value: ethPrice}(tokenId);
        
        // Both alice (seller) and bob (buyer) should get 1 activity point
        assertEq(main.getUserActivityPoints(alice), 1);
        assertEq(main.getUserActivityPoints(bob), 1);
        
        // Verify ownership transferred
        assertEq(asset.ownerOf(tokenId), bob);
    }
    
    function testActivityPointsForLoanFundingAndRepayment() public {
        // Alice mints an NFT
        vm.prank(alice);
        uint256 tokenId = main.mint(TOKEN_URI_2);
        
        // Alice requests a loan
        vm.prank(alice);
        main.requestLoan(tokenId, USD_200, 30); // $200 USD, 30 days
        
        // Check initial activity points
        assertEq(main.getUserActivityPoints(alice), 0);
        assertEq(main.getUserActivityPoints(bob), 0);
        
        // Get the required ETH amount for funding
        (uint256 loanAmountETH, , , , , , ) = main.getLoanInfo(tokenId);
        
        // Bob funds the loan
        vm.prank(bob);
        main.fundLoan{value: loanAmountETH}(tokenId);
        
        // Bob (lender) should get 1 activity point for funding
        assertEq(main.getUserActivityPoints(bob), 1);
        assertEq(main.getUserActivityPoints(alice), 0); // Alice hasn't done anything point-worthy yet
        
        // Get repayment amount (loan + interest)
        uint256 repaymentAmount = main.getTotalRepaymentAmount(tokenId);
        
        // Alice repays the loan
        vm.prank(alice);
        main.repayLoan{value: repaymentAmount}(tokenId);
        
        // Alice (borrower) should get 1 activity point for repayment
        assertEq(main.getUserActivityPoints(alice), 1);
        assertEq(main.getUserActivityPoints(bob), 1);
        
        // Verify NFT returned to Alice
        assertEq(asset.ownerOf(tokenId), alice);
    }

    function testActivityPointsForLoanLiquidation() public {
    // Alice mints an NFT
    vm.prank(alice);
    uint256 tokenId = main.mint(TOKEN_URI_3);

    // Alice requests a loan
    vm.prank(alice);
    main.requestLoan(tokenId, USD_100, 1); // 1 day duration

    // Fetch the actual loan amount in ETH
    (uint256 loanAmount,,,,,,,,) = main.getLoanInfoWithUSD(tokenId);

    // Bob funds the loan
    vm.prank(bob);
    main.fundLoan{value: loanAmount}(tokenId);

    // Fast forward past loan deadline
    vm.warp(block.timestamp + 2 days);

    // Check initial activity points
    assertEq(main.getUserActivityPoints(charlie), 0);

    // Charlie liquidates the expired loan
    vm.prank(charlie);
    main.liquidateAsset(tokenId);

    // Charlie should get 1 activity point for liquidation
    assertEq(main.getUserActivityPoints(charlie), 1);

    // Verify NFT transferred to original lender (Bob)
    assertEq(asset.ownerOf(tokenId), bob);
}


    function testActivityPointsMultipleActivities() public {
    // Test that users can accumulate points across different activities
    
    // Alice mints multiple NFTs
    vm.startPrank(alice);
    uint256 tokenId1 = main.mint(TOKEN_URI_1);
    uint256 tokenId2 = main.mint("https://example.com/token/4");
    main.createSale(tokenId1, USD_100);
    vm.stopPrank();
    
    // Get the correct ETH price for the sale
    (uint256 ethPrice, uint256 priceUSD) = main.getSaleETHPrice(tokenId1);
    
    // Bob buys Alice's NFT (both get 1 point) - use the correct ETH price
    vm.prank(bob);
    main.purchaseNFT{value: ethPrice}(tokenId1);

    assertEq(main.getUserActivityPoints(alice), 1); // Sale
    assertEq(main.getUserActivityPoints(bob), 1);   // Purchase
    
    // Alice requests a loan with her second NFT
    vm.prank(alice);
    main.requestLoan(tokenId2, USD_200, 30); // $200 USD, 30 days
    
    // Get the required ETH amount for funding
    (uint256 loanAmountETH, , , , , , ) = main.getLoanInfo(tokenId2);
    
    // Bob funds Alice's loan (Bob gets another point)
    vm.prank(bob);
    main.fundLoan{value: loanAmountETH}(tokenId2);
    
    assertEq(main.getUserActivityPoints(bob), 2); // Purchase + Funding
    
    // Alice repays the loan (Alice gets another point)
    uint256 repaymentAmount = main.getTotalRepaymentAmount(tokenId2);
    vm.prank(alice);
    main.repayLoan{value: repaymentAmount}(tokenId2);
    
    assertEq(main.getUserActivityPoints(alice), 2); // Sale + Repayment
    assertEq(main.getUserActivityPoints(bob), 2);   // Purchase + Funding
    
    // Verify final state
    assertEq(asset.ownerOf(tokenId1), bob);   // Bob owns purchased NFT
    assertEq(asset.ownerOf(tokenId2), alice); // Alice got her collateral back
}
}
