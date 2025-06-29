
interface NFTData {
  tokenId: string;
  name: string;
  imageUrl: string;
  owner: string;
  proofOfOwnership?: string;
}

type NFTSale = {
  tokenId: string;
  name: string;
  imageUrl: string;
  priceUSD: string; // Price in USD (formatted, e.g., "100.50")
  priceETH: string; // Current ETH equivalent (formatted)
  priceUSDRaw: string; // Raw USD price with 8 decimals
  seller: string;
  proofOfOwnership?: string;
};

// Enhanced loan-related types
interface LoanData {
  tokenId: string;
  loanAmount: string;
  interestAmount: string;
  deadline: number;
  borrower: string;
  lender: string;
  startTime: number;
  isActive: boolean;
  name?: string;
  imageUrl?: string;
  proofOfOwnership?: string;
}

interface LoanDataWithUSD extends LoanData {
  loanAmountUSD: string;
  interestAmountUSD: string;
}

interface LoanRequest {
  tokenId: string;
  borrower: string;
  loanAmount: string;
  deadline: number;
  isFunded: boolean;
  name?: string;
  imageUrl?: string;
  proofOfOwnership?: string;
}

interface ActiveSalesData {
  tokenIds: string[];
  sellers: string[];
  pricesUSD: string[];
  pricesETH: string[];
}


export type {NFTData, NFTSale, LoanData, LoanDataWithUSD, LoanRequest, ActiveSalesData};