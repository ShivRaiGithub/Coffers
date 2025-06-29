// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./Asset.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Lending is ReentrancyGuard, IERC721Receiver, Ownable {
    Asset public nftContract;
    address public mainContract;

    struct Loan {
        address borrower;
        address lender;
        uint256 loanAmount;
        uint256 interestAmount; // 10% of loan amount
        uint256 deadline;
        uint256 startTime;
        bool active;
    }

    mapping(uint256 => Loan) public loans;
    uint256[] public tokensForLoan;
    uint256[] public liquidatableTokens; // Temporary array for Chainlink automation

    uint256 private constant INTEREST_RATE = 1000; // 10% in basis points (10000 = 100%)
    uint256 private constant BASIS = 10000;

    event LoanRequested(uint256 indexed tokenId, address borrower, uint256 loanAmount, uint256 deadline);
    event LoanFunded(uint256 indexed tokenId, address borrower, address lender, uint256 loanAmount);
    event LoanRepaid(uint256 indexed tokenId, address borrower, uint256 totalAmount);
    event LoanLiquidated(uint256 indexed tokenId, address borrower, address lender);
    event LoanCancelled(uint256 indexed tokenId, address borrower);

    modifier onlyAllowed() {
        require(msg.sender == mainContract || msg.sender==address(this), "Only allowed contracts can call this");
        _;
    }

    constructor() Ownable(msg.sender) {

    }

    function setMainContract(address _mainContract) external onlyOwner {
        require(mainContract == address(0), "Main contract already set");
        mainContract = _mainContract;
    }

    function setNftContract(address _nftContract) external onlyOwner {
        require(address(nftContract) == address(0), "NFT contract already set");
        nftContract = Asset(_nftContract);
    }

    // ========== ERC721 RECEIVER ==========
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        require(msg.sender == address(nftContract), "Only accept our NFTs");
        return IERC721Receiver.onERC721Received.selector;
    }

    // ========== LOAN FUNCTIONS ==========
    function requestLoan(uint256 tokenId, uint256 loanAmount, uint256 durationInDays, address caller) external onlyAllowed {
        require(nftContract.ownerOf(tokenId) == caller, "Not token owner");
        require(loanAmount > 0, "Invalid loan amount");
        require(durationInDays > 0, "Invalid duration");
        require(!loans[tokenId].active, "Loan already exists");
        
        uint256 deadline = durationInDays;
        uint256 interestAmount = (loanAmount * INTEREST_RATE) / BASIS;
        
        loans[tokenId] = Loan({
            borrower: caller,
            lender: address(0),
            loanAmount: loanAmount,
            interestAmount: interestAmount,
            deadline: deadline,
            startTime: 0,
            active: true
        });
        
        tokensForLoan.push(tokenId);
        
        emit LoanRequested(tokenId, caller, loanAmount, deadline);
    }

    function fundLoan(uint256 tokenId, address caller) external payable nonReentrant onlyAllowed {
        Loan storage loan = loans[tokenId];
        require(loan.active && loan.borrower != address(0), "No active loan request");
        require(loan.lender == address(0), "Already funded");
        require(caller != loan.borrower, "Cannot fund own loan");
        require(msg.value == loan.loanAmount, "Incorrect amount");
        
        loan.lender = caller;
        loan.startTime = block.timestamp;
        
        // loan.deadline=loan.startTime+(loan.deadline*1 days);
        loan.deadline=loan.startTime+(loan.deadline*1 seconds);


        // Transfer NFT to this contract as collateral
        nftContract.facilitateTransfer(loan.borrower, address(this), tokenId);
        
        // Send loan amount to borrower
        payable(loan.borrower).transfer(msg.value);
        
        emit LoanFunded(tokenId, loan.borrower, caller, msg.value);
    }

    function repayLoan(uint256 tokenId, address caller) external payable nonReentrant onlyAllowed {
        Loan memory loan = loans[tokenId];
        require(loan.borrower == caller, "Not borrower");
        require(loan.lender != address(0), "Loan not funded");
        require(loan.active, "Loan not active");
        require(block.timestamp <= loan.deadline, "Loan expired");
        
        uint256 totalRepayment = loan.loanAmount + loan.interestAmount;
        require(msg.value >= totalRepayment, "Insufficient repayment");
        
        // Clean up loan data
        delete loans[tokenId];
        _removeLoan(tokenId);
        
        // Pay lender (loan amount + interest)
        payable(loan.lender).transfer(totalRepayment);
        
        // Return NFT to borrower
        nftContract.facilitateTransfer(address(this), caller, tokenId);
        
        // Return excess payment if any
        if (msg.value > totalRepayment) {
            payable(caller).transfer(msg.value - totalRepayment);
        }
        
        emit LoanRepaid(tokenId, caller, totalRepayment);
    }

    function cancelLoanRequest(uint256 tokenId, address caller) external onlyAllowed {
        Loan memory loan = loans[tokenId];
        require(loan.borrower == caller, "Not borrower");
        require(loan.lender == address(0), "Loan already funded");
        require(loan.active, "Loan not active");
        
        delete loans[tokenId];
        _removeLoan(tokenId);
        
        emit LoanCancelled(tokenId, caller);
    }

    // ========== CHAINLINK AUTOMATION FUNCTIONS ==========
    
    // Function 1: Check all collateralized assets and prepare liquidation list
    function checkAndPrepareLiquidations() external onlyAllowed returns (uint256[] memory) {
        // Clear previous liquidatable tokens
        delete liquidatableTokens;
        
        // Go through all active loans
        for (uint256 i = 0; i < tokensForLoan.length; i++) {
            uint256 tokenId = tokensForLoan[i];
            Loan memory loan = loans[tokenId];
            
            // Check if loan is funded and past deadline
            if (loan.active && loan.lender != address(0) && block.timestamp > loan.deadline) {
                liquidatableTokens.push(tokenId);
                // Call function2 for each liquidatable asset
                liquidateAsset(tokenId);
            }
        }
        
        return liquidatableTokens;
    }
    
    // Function 2: Transfer ownership from borrower to lender
    function liquidateAsset(uint256 tokenId) public nonReentrant onlyAllowed {
        Loan memory loan = loans[tokenId];
        require(loan.active && loan.lender != address(0), "No active funded loan");
        require(block.timestamp > loan.deadline, "Loan not expired yet");
        
        // Clean up loan data
        delete loans[tokenId];
        _removeLoan(tokenId);
        
        // Transfer NFT to lender
        nftContract.facilitateTransfer(address(this), loan.lender, tokenId);
        
        emit LoanLiquidated(tokenId, loan.borrower, loan.lender);
    }


    // ========== INTERNAL FUNCTIONS ==========
    function _removeLoan(uint256 tokenId) private {
        uint256 len = tokensForLoan.length;
        for (uint256 i = 0; i < len; i++) {
            if (tokensForLoan[i] == tokenId) {
                tokensForLoan[i] = tokensForLoan[len - 1];
                tokensForLoan.pop();
                break;
            }
        }
    }

    // ========== VIEW FUNCTIONS ==========
    function getLoanInfo(uint256 tokenId) external view returns (
        uint256 loanAmount,
        uint256 interestAmount,
        uint256 deadline,
        address borrower,
        address lender,
        uint256 startTime,
        bool active
    ) {
        Loan memory loan = loans[tokenId];
        return (
            loan.loanAmount,
            loan.interestAmount,
            loan.deadline,
            loan.borrower,
            loan.lender,
            loan.startTime,
            loan.active
        );
    }

    function getAllActiveLoans() external view returns (
        uint256[] memory tokenIds,
        address[] memory borrowers,
        uint256[] memory amounts,
        uint256[] memory deadlines,
        bool[] memory funded
    ) {
        uint256 len = tokensForLoan.length;
        tokenIds = new uint256[](len);
        borrowers = new address[](len);
        amounts = new uint256[](len);
        deadlines = new uint256[](len);
        funded = new bool[](len);
        
        for (uint256 i = 0; i < len; i++) {
            uint256 tokenId = tokensForLoan[i];
            Loan memory loan = loans[tokenId];
            tokenIds[i] = tokenId;
            borrowers[i] = loan.borrower;
            amounts[i] = loan.loanAmount;
            deadlines[i] = loan.deadline;
            funded[i] = loan.lender != address(0);
        }
    }

    function getTokensForLoan() external view returns (uint256[] memory) {
        return tokensForLoan;
    }

    function getLiquidatableTokens() external view returns (uint256[] memory) {
        return liquidatableTokens;
    }

    function getTotalRepaymentAmount(uint256 tokenId) external view returns (uint256) {
        Loan memory loan = loans[tokenId];
        require(loan.active, "No active loan");
        return loan.loanAmount + loan.interestAmount;
    }

    function getInterestRate() external pure returns (uint256) {
        return INTEREST_RATE;
    }

    function isLoanExpired(uint256 tokenId) external view returns (bool) {
        Loan memory loan = loans[tokenId];
        return loan.active && loan.lender != address(0) && block.timestamp > loan.deadline;
    }
}