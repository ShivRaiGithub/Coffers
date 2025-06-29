
import { ethers } from 'ethers';
import { LoanData, LoanDataWithUSD, LoanRequest } from "./interfaces";

// Export function factory that takes dependencies and returns the functions
export const createLoanFunctions = (
  getContract: () => ethers.Contract,
  fetchNFTMetadata: (contract: any, tokenId: string) => Promise<{name: string, imageUrl: string, proofOfOwnership: string}>,
  signer: ethers.JsonRpcSigner | null
) => {
  // ========== LOAN FUNCTIONS ==========

  // Request a loan using NFT as collateral - takes USD amount
  const requestLoan = async (
    tokenId: string, 
    loanAmountUSD: string, 
    durationInDays: number
  ): Promise<void> => {
    try {
      const contract = getContract();
      // Convert USD to 8 decimal format
      const loanAmountUSDFormatted = ethers.parseUnits(loanAmountUSD, 8);
      
      const tx = await contract.requestLoan(tokenId, loanAmountUSDFormatted, durationInDays);
      await tx.wait();
    } catch (error: any) {
      console.error('Error requesting loan:', error);
      throw new Error(`Failed to request loan: ${error.message || 'Unknown error'}`);
    }
  };

  // Fund loan function
  const fundLoan = async (tokenId: string): Promise<void> => {
    try {
      const contract = getContract();
      
      console.log("=== FUNDING LOAN DEBUG ===");
      console.log("TokenId:", tokenId);
      console.log("Sender address:", await signer!.getAddress());
      console.log("Contract address:", contract.target);
      
      // Get loan info first to get the required amount
      const loanInfo = await contract.getLoanInfo(tokenId);
      const loanAmount = loanInfo[0]; // loanAmount is first in the tuple
      
      console.log("Required loan amount (Wei):", loanAmount.toString());
      console.log("Required loan amount (ETH):", ethers.formatEther(loanAmount));
      
      const tx = await contract.fundLoan(tokenId, { value: loanAmount });
      console.log("Transaction sent:", tx.hash);
      await tx.wait();
      console.log("Transaction confirmed");
      
    } catch (error: any) {
      console.error('Error funding loan:', error);
      throw new Error(`Failed to fund loan: ${error.message || 'Unknown error'}`);
    }
  };

  // Repay loan function
  const repayLoan = async (tokenId: string): Promise<void> => {
    try {
      const contract = getContract();
      
      // Get the total repayment amount required
      const totalRepaymentAmount = await contract.getTotalRepaymentAmount(tokenId);
      
      console.log("=== REPAYING LOAN DEBUG ===");
      console.log("TokenId:", tokenId);
      console.log("Total repayment amount (Wei):", totalRepaymentAmount.toString());
      console.log("Total repayment amount (ETH):", ethers.formatEther(totalRepaymentAmount));
      
      const tx = await contract.repayLoan(tokenId, { value: totalRepaymentAmount });
      await tx.wait();
    } catch (error: any) {
      console.error('Error repaying loan:', error);
      throw new Error(`Failed to repay loan: ${error.message || 'Unknown error'}`);
    }
  };

  // Liquidate a loan (direct)
  const liquidateAsset = async (tokenId: string): Promise<void> => {
    try {
      const contract = getContract();
      const tx = await contract.liquidateAsset(tokenId);
      await tx.wait();
    } catch (error: any) {
      console.error('Error liquidating loan:', error);
      throw new Error(`Failed to liquidate loan: ${error.message || 'Unknown error'}`);
    }
  };

  // Cancel a loan request
  const cancelLoanRequest = async (tokenId: string): Promise<void> => {
    try {
      const contract = getContract();
      const tx = await contract.cancelLoanRequest(tokenId);
      await tx.wait();
    } catch (error: any) {
      console.error('Error cancelling loan request:', error);
      throw new Error(`Failed to cancel loan request: ${error.message || 'Unknown error'}`);
    }
  };

  // Get loan info
  const getLoanInfo = async (tokenId: string): Promise<LoanData | null> => {
    try {
      const contract = getContract();
      const [loanAmount, interestAmount, deadline, borrower, lender, startTime, isActive] = 
        await contract.getLoanInfo(tokenId);

      if (!isActive) {
        return null;
      }

      const metadata = await fetchNFTMetadata(contract, tokenId);

      return {
        tokenId,
        loanAmount: ethers.formatEther(loanAmount),
        interestAmount: ethers.formatEther(interestAmount),
        deadline: Number(deadline),
        borrower,
        lender,
        startTime: Number(startTime),
        isActive,
        name: metadata.name,
        imageUrl: metadata.imageUrl,
        proofOfOwnership: metadata.proofOfOwnership
      };
    } catch (error) {
      console.error('Error getting loan info:', error);
      return null;
    }
  };

  // Get all active loans
  const getAllActiveLoans = async (): Promise<LoanRequest[]> => {
    try {
      const contract = getContract();
      const result = await contract.getAllActiveLoans();
      const [tokenIds, borrowers, loanAmounts, deadlines, isFunded] = result;

      const loans: LoanRequest[] = [];

      for (let i = 0; i < tokenIds.length; i++) {
        try {
          const metadata = await fetchNFTMetadata(contract, tokenIds[i].toString());

          loans.push({
            tokenId: tokenIds[i].toString(),
            borrower: borrowers[i],
            loanAmount: ethers.formatEther(loanAmounts[i]),
            deadline: Number(deadlines[i]),
            isFunded: isFunded[i],
            name: metadata.name,
            imageUrl: metadata.imageUrl,
            proofOfOwnership: metadata.proofOfOwnership
          });
        } catch (err) {
          console.warn(`Error processing loan for token ${tokenIds[i]}:`, err);
        }
      }

      return loans;
    } catch (error) {
      console.error('Error getting all active loans:', error);
      return [];
    }
  };

  // Get tokens available for loan requests
  const getTokensForLoan = async (): Promise<string[]> => {
    try {
      const contract = getContract();
      const tokens = await contract.getTokensForLoan();
      return tokens.map((token: bigint) => token.toString());
    } catch (error: any) {
      console.error('Error getting tokens for loan:', error);
      throw new Error(`Failed to get tokens for loan: ${error.message || 'Unknown error'}`);
    }
  };

  // Check if a loan is expired
  const isLoanExpired = async (tokenId: string): Promise<boolean> => {
    try {
      const contract = getContract();
      return await contract.isLoanExpired(tokenId);
    } catch (error: any) {
      console.error('Error checking loan expiry:', error);
      throw new Error(`Failed to check loan expiry: ${error.message || 'Unknown error'}`);
    }
  };


// Get liquidatable tokens
const getLiquidatableTokens = async (): Promise<string[]> => {
  try {
    const contract = getContract();
    const tokens = await contract.getLiquidatableTokens();
    return tokens.map((token: bigint) => token.toString());
  } catch (error: any) {
    console.error('Error getting liquidatable tokens:', error);
    throw new Error(`Failed to get liquidatable tokens: ${error.message || 'Unknown error'}`);
  }
};

// Get total repayment amount including interest
const getTotalRepaymentAmount = async (tokenId: string): Promise<string> => {
  try {
    const contract = getContract();
    const totalAmount = await contract.getTotalRepaymentAmount(tokenId);
    return ethers.formatEther(totalAmount);
  } catch (error: any) {
    console.error('Error getting total repayment amount:', error);
    throw new Error(`Failed to get total repayment amount: ${error.message || 'Unknown error'}`);
  }
};

// NEW: Get total repayment amount with USD conversion
const getTotalRepaymentAmountWithUSD = async (tokenId: string): Promise<{ethAmount: string, usdAmount: string}> => {
  try {
    const contract = getContract();
    const result = await contract.getTotalRepaymentAmountWithUSD(tokenId);
    return {
      ethAmount: ethers.formatEther(result.ethAmount),
      usdAmount: ethers.formatUnits(result.usdAmount, 8) // USD has 8 decimals
    };
  } catch (error: any) {
    console.error('Error getting total repayment amount with USD:', error);
    throw new Error(`Failed to get total repayment amount with USD: ${error.message || 'Unknown error'}`);
  }
};

// Check and prepare liquidations function
const checkAndPrepareLiquidations = async (): Promise<string[]> => {
  try {
    const contract = getContract();
    const tx = await contract.checkAndPrepareLiquidations();
    
    console.log('checkAndPrepareLiquidations transaction:', tx);
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log('Transaction receipt:', receipt);
    
    // Since this is a transaction that performs liquidations,
    // we need to parse the events or return a success indicator
    // For now, we'll return an array indicating success
    // You might want to parse events from the receipt to get actual liquidated tokens
    if (receipt.status === 1) {
      // Transaction successful, return placeholder array
      // In a real implementation, you'd parse events to get liquidated token IDs
      return ['success']; // Placeholder to indicate success
    } else {
      return [];
    }
  } catch (error: any) {
    console.error('Error checking and preparing liquidations:', error);
    throw new Error(`Failed to check and prepare liquidations: ${error.message || 'Unknown error'}`);
  }
};

// NEW: Get loan info with USD conversion
const getLoanInfoWithUSD = async (tokenId: string): Promise<LoanDataWithUSD | null> => {
  try {
    const contract = getContract();
    const result = await contract.getLoanInfoWithUSD(tokenId);
    
    if (!result.active) {
      return null;
    }

    return {
      tokenId,
      loanAmount: ethers.formatEther(result.loanAmountETH),
      interestAmount: ethers.formatEther(result.interestAmountETH),
      loanAmountUSD: ethers.formatUnits(result.loanAmountUSD, 8),
      interestAmountUSD: ethers.formatUnits(result.interestAmountUSD, 8),
      deadline: Number(result.deadline),
      borrower: result.borrower,
      lender: result.lender,
      startTime: Number(result.startTime),
      isActive: result.active
    };
  } catch (error: any) {
    console.error('Error getting loan info with USD:', error);
    throw new Error(`Failed to get loan info with USD: ${error.message || 'Unknown error'}`);
  }
};

  // Return all the functions
  return {
    requestLoan,
    fundLoan,
    repayLoan,
    liquidateAsset,
    cancelLoanRequest,
    getLoanInfo,
    getLoanInfoWithUSD,
    getAllActiveLoans,
    getTokensForLoan,
    isLoanExpired,
    getLiquidatableTokens,
    getTotalRepaymentAmount,
    getTotalRepaymentAmountWithUSD,
    checkAndPrepareLiquidations
  };
};