// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "./Asset.sol";
import "./Lending.sol";

contract Main is ReentrancyGuard {
    Asset public immutable nftContract;
    Lending public immutable lendingContract;
    
    // Chainlink ETH/USD price feed for Avalanche
    AggregatorV3Interface internal priceFeed;

    struct Sale {
        address seller;
        uint256 priceUSD; // Price in USD (8 decimals)
        bool active;
    }

    mapping(uint256 => Sale) public sales;
    uint256[] public tokensForSale;

    // Activity Points System
    mapping(address => uint256) public activityPoints;
    
    event SaleCreated(uint256 indexed tokenId, address indexed seller, uint256 priceUSD);
    event SaleCompleted(uint256 indexed tokenId, address seller, address buyer, uint256 priceUSD, uint256 ethPaid);
    event SaleCancelled(uint256 indexed tokenId, address seller);
    event ActivityPointsAwarded(address indexed user, uint256 points, string reason);

    constructor(
        address _priceFeed,
        address _nft,
        address _lending
    ) {
        priceFeed = AggregatorV3Interface(_priceFeed);
        nftContract = Asset(_nft);
        lendingContract = Lending(_lending);
    }

    // ========== PRICE FEED FUNCTIONS ==========
    
    /**
     * Returns the latest ETH/USD price
     * @return price The latest price with 8 decimals
     */
    function getLatestPrice() public view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }
    
    /**
     * Converts USD amount to ETH amount based on current price
     * @param usdAmount Amount in USD (8 decimals)
     * @return ethAmount Amount in ETH (18 decimals)
     */
    function convertUSDToETH(uint256 usdAmount) public view returns (uint256) {
        int256 ethPriceUSD = getLatestPrice();
        require(ethPriceUSD > 0, "Invalid price from oracle");
        
        // usdAmount has 8 decimals, ethPriceUSD has 8 decimals
        // We want result in 18 decimals (wei)
        // ethAmount = (usdAmount * 1e18) / ethPriceUSD
        uint256 ethAmount = (usdAmount * 1e18) / uint256(ethPriceUSD);
        return ethAmount;
    }
    
    /**
     * Converts ETH amount to USD amount based on current price
     * @param ethAmount Amount in ETH (18 decimals)
     * @return usdAmount Amount in USD (8 decimals)
     */
    function convertETHToUSD(uint256 ethAmount) public view returns (uint256) {
        int256 ethPriceUSD = getLatestPrice();
        require(ethPriceUSD > 0, "Invalid price from oracle");
        
        // ethAmount has 18 decimals, ethPriceUSD has 8 decimals
        // We want result in 8 decimals
        // usdAmount = (ethAmount * ethPriceUSD) / 1e18
        uint256 usdAmount = (ethAmount * uint256(ethPriceUSD)) / 1e18;
        return usdAmount;
    }

    // ========== ACTIVITY POINTS FUNCTIONS ==========
    function _awardActivityPoint(address user, string memory reason) internal {
        activityPoints[user] += 1;
        emit ActivityPointsAwarded(user, 1, reason);
    }

    function getUserActivityPoints(address user) external view returns (uint256) {
        return activityPoints[user];
    }

    // ========== NFT FUNCTIONS ==========
    function mint(string memory uri) external returns (uint256) {
        // Anyone can mint an NFT by providing token URI
        uint256 tokenId = nftContract.mint(msg.sender, uri);
        return tokenId;
    }

    // ========== SALE FUNCTIONS ==========
    
    /**
     * Create a sale with price in USD
     * @param tokenId The NFT token ID
     * @param priceUSD Price in USD (8 decimals, e.g., 100.50 USD = 10050000000)
     */
    function createSale(uint256 tokenId, uint256 priceUSD) external {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(priceUSD > 0, "Price must be positive");
        require(!sales[tokenId].active, "Sale already exists");
        
        // Check if token is not used as collateral
        (, , , , , , bool loanActive) = lendingContract.getLoanInfo(tokenId);
        require(!loanActive, "Token is used as collateral");
        
        sales[tokenId] = Sale({
            seller: msg.sender,
            priceUSD: priceUSD,
            active: true
        });
        tokensForSale.push(tokenId);
        
        emit SaleCreated(tokenId, msg.sender, priceUSD);
    }

    /**
     * Purchase NFT by paying the ETH equivalent of the USD price
     * @param tokenId The NFT token ID
     */
    function purchaseNFT(uint256 tokenId) external payable nonReentrant {
        Sale memory sale = sales[tokenId];
        require(sale.active, "No active sale");
        require(msg.sender != sale.seller, "Cannot buy own NFT");
        
        // Calculate required ETH amount based on current price
        uint256 requiredETH = convertUSDToETH(sale.priceUSD);
        
        // Allow for 1% price slippage to account for price movements
        uint256 minAcceptableETH = (requiredETH * 99) / 100;
        uint256 maxAcceptableETH = (requiredETH * 101) / 100;
        
        require(msg.value >= minAcceptableETH, "Payment too low");
        require(msg.value <= maxAcceptableETH, "Payment too high");
        
        address seller = sale.seller;
        address buyer = msg.sender;
        uint256 priceUSD = sale.priceUSD;
        
        // Clean up sale data
        delete sales[tokenId];
        _removeSale(tokenId);
        
        // Transfer payment to seller
        payable(seller).transfer(msg.value);
        
        // Transfer NFT to buyer
        nftContract.facilitateTransfer(seller, buyer, tokenId);
        
        // Award activity points for NFT sale
        _awardActivityPoint(seller, "NFT Sale - Seller");
        _awardActivityPoint(buyer, "NFT Sale - Buyer");
        
        emit SaleCompleted(tokenId, seller, buyer, priceUSD, msg.value);
    }

    /**
     * Get the current ETH price for a sale
     * @param tokenId The NFT token ID
     * @return ethPrice Current ETH price for the sale
     * @return priceUSD USD price of the sale
     */
    function getSaleETHPrice(uint256 tokenId) external view returns (uint256 ethPrice, uint256 priceUSD) {
        require(sales[tokenId].active, "No active sale");
        priceUSD = sales[tokenId].priceUSD;
        ethPrice = convertUSDToETH(priceUSD);
    }

    function cancelSale(uint256 tokenId) external {
        require(sales[tokenId].seller == msg.sender, "Not seller");
        require(sales[tokenId].active, "No active sale");
        
        delete sales[tokenId];
        _removeSale(tokenId);
        
        emit SaleCancelled(tokenId, msg.sender);
    }

    // ========== LENDING DELEGATION FUNCTIONS ==========
    
    /**
     * Request a loan with amount in USD
     * @param tokenId The NFT token ID to use as collateral
     * @param loanAmountUSD Loan amount in USD (8 decimals)
     * @param durationInDays Loan duration in days
     */
    function requestLoan(uint256 tokenId, uint256 loanAmountUSD, uint256 durationInDays) external {
        // Check if token is not for sale
        require(!sales[tokenId].active, "Token is for sale");
        
        // Convert USD to ETH for the lending contract
        uint256 loanAmountETH = convertUSDToETH(loanAmountUSD);
        
        lendingContract.requestLoan(tokenId, loanAmountETH, durationInDays, msg.sender);
    }

    function fundLoan(uint256 tokenId) external payable {
        // Get loan info before funding to check if it was previously unfunded
        (, , , , address previousLender, , bool active) = lendingContract.getLoanInfo(tokenId);
        require(active, "No active loan request");
        require(previousLender == address(0), "Already funded");
        
        lendingContract.fundLoan{value: msg.value}(tokenId, msg.sender);
        
        // Award activity point for successful loan funding
        _awardActivityPoint(msg.sender, "Loan Funding");
    }

    function repayLoan(uint256 tokenId) external payable {
        // Get loan info to verify this is a valid repayment
        (, , , address borrower, address lender, , bool active) = lendingContract.getLoanInfo(tokenId);
        require(active, "No active loan");
        require(borrower == msg.sender, "Not borrower");
        require(lender != address(0), "Loan not funded");
        
        lendingContract.repayLoan{value: msg.value}(tokenId, msg.sender);
        
        // Award activity point for successful loan repayment
        _awardActivityPoint(msg.sender, "Loan Repayment");
    }

    function cancelLoanRequest(uint256 tokenId) external {
        lendingContract.cancelLoanRequest(tokenId, msg.sender);
    }

    // ========== CHAINLINK AUTOMATION FUNCTIONS ==========
    function checkAndPrepareLiquidations() external returns (uint256[] memory) {
        return lendingContract.checkAndPrepareLiquidations();
    }

    function liquidateAsset(uint256 tokenId) external {
        // Check if loan is actually liquidatable
        require(lendingContract.isLoanExpired(tokenId), "Loan not expired");
        
        lendingContract.liquidateAsset(tokenId);
        
        // Award activity point for successful liquidation
        _awardActivityPoint(msg.sender, "Loan Liquidation");
    }

    // ========== INTERNAL FUNCTIONS ==========
    function _removeSale(uint256 tokenId) private {
        uint256 len = tokensForSale.length;
        for (uint256 i = 0; i < len; i++) {
            if (tokensForSale[i] == tokenId) {
                tokensForSale[i] = tokensForSale[len - 1];
                tokensForSale.pop();
                break;
            }
        }
    }

    // ========== VIEW FUNCTIONS ==========
    
    // Sale view functions
    function getSaleInfo(uint256 tokenId) external view returns (address seller, uint256 priceUSD, bool active) {
        Sale memory sale = sales[tokenId];
        return (sale.seller, sale.priceUSD, sale.active);
    }

    function getTokensForSale() external view returns (uint256[] memory) {
        return tokensForSale;
    }

    function getAllActiveSales() external view returns (
        uint256[] memory tokenIds,
        address[] memory sellers,
        uint256[] memory pricesUSD,
        uint256[] memory pricesETH
    ) {
        uint256 len = tokensForSale.length;
        tokenIds = new uint256[](len);
        sellers = new address[](len);
        pricesUSD = new uint256[](len);
        pricesETH = new uint256[](len);
        
        for (uint256 i = 0; i < len; i++) {
            uint256 tokenId = tokensForSale[i];
            Sale memory sale = sales[tokenId];
            tokenIds[i] = tokenId;
            sellers[i] = sale.seller;
            pricesUSD[i] = sale.priceUSD;
            pricesETH[i] = convertUSDToETH(sale.priceUSD);
        }
    }

    // Lending view functions (delegated)
    function getLoanInfo(uint256 tokenId) external view returns (
        uint256 loanAmount,
        uint256 interestAmount,
        uint256 deadline,
        address borrower,
        address lender,
        uint256 startTime,
        bool active
    ) {
        return lendingContract.getLoanInfo(tokenId);
    }

    /**
     * Get loan info with USD conversion
     * @param tokenId The NFT token ID
     * @return loanAmountETH Loan amount in ETH
     * @return loanAmountUSD Loan amount in USD
     * @return interestAmountETH Interest amount in ETH
     * @return interestAmountUSD Interest amount in USD
     * @return deadline Loan deadline
     * @return borrower Borrower address
     * @return lender Lender address
     * @return startTime Loan start time
     * @return active Whether loan is active
     */
    function getLoanInfoWithUSD(uint256 tokenId) external view returns (
        uint256 loanAmountETH,
        uint256 loanAmountUSD,
        uint256 interestAmountETH,
        uint256 interestAmountUSD,
        uint256 deadline,
        address borrower,
        address lender,
        uint256 startTime,
        bool active
    ) {
        (loanAmountETH, interestAmountETH, deadline, borrower, lender, startTime, active) = lendingContract.getLoanInfo(tokenId);
        loanAmountUSD = convertETHToUSD(loanAmountETH);
        interestAmountUSD = convertETHToUSD(interestAmountETH);
    }

    function getAllActiveLoans() external view returns (
        uint256[] memory tokenIds,
        address[] memory borrowers,
        uint256[] memory amounts,
        uint256[] memory deadlines,
        bool[] memory funded
    ) {
        return lendingContract.getAllActiveLoans();
    }

    function getTokensForLoan() external view returns (uint256[] memory) {
        return lendingContract.getTokensForLoan();
    }

    function getTotalRepaymentAmount(uint256 tokenId) external view returns (uint256) {
        return lendingContract.getTotalRepaymentAmount(tokenId);
    }

    /**
     * Get total repayment amount in both ETH and USD
     * @param tokenId The NFT token ID
     * @return ethAmount Amount in ETH
     * @return usdAmount Amount in USD
     */
    function getTotalRepaymentAmountWithUSD(uint256 tokenId) external view returns (uint256 ethAmount, uint256 usdAmount) {
        ethAmount = lendingContract.getTotalRepaymentAmount(tokenId);
        usdAmount = convertETHToUSD(ethAmount);
    }

    function getLiquidatableTokens() external view returns (uint256[] memory) {
        return lendingContract.getLiquidatableTokens();
    }

    function isLoanExpired(uint256 tokenId) external view returns (bool) {
        return lendingContract.isLoanExpired(tokenId);
    }

    // NFT view functions (delegated)
    function getAllTokens() external view returns (uint256[] memory) {
        return nftContract.getAllTokens();
    }

    function getTokensOfOwner(address owner) external view returns (uint256[] memory) {
        return nftContract.getTokensOfOwner(owner);
    }

    function totalMinted() external view returns (uint256) {
        return nftContract.totalMinted();
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        return nftContract.tokenURI(tokenId);
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return nftContract.ownerOf(tokenId);
    }

    function balanceOf(address owner) external view returns (uint256) {
        return nftContract.balanceOf(owner);
    }

    function name() external view returns (string memory) {
        return nftContract.name();
    }

    function symbol() external view returns (string memory) {
        return nftContract.symbol();
    }

    // Contract addresses for frontend integration
    function getNftContractAddress() external view returns (address) {
        return address(nftContract);
    }

    function getLendingContractAddress() external view returns (address) {
        return address(lendingContract);
    }

    function getPriceFeedAddress() external view returns (address) {
        return address(priceFeed);
    }
}