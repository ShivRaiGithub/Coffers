
import { ethers } from 'ethers';

// Export function factory that takes dependencies and returns the functions
export const createViewFunctions = (
  getContract: () => ethers.Contract,
  account: string | null
) => {
  // ========== PRICE FEED FUNCTIONS ==========

  // Get latest ETH/USD price
  const getLatestPrice = async (): Promise<string> => {
    try {
      const contract = getContract();
      const price = await contract.getLatestPrice();
      return ethers.formatUnits(price, 8); // Price feed has 8 decimals
    } catch (error: any) {
      console.error('Error getting latest price:', error);
      throw new Error(`Failed to get latest price: ${error.message || 'Unknown error'}`);
    }
  };

  // Convert USD to ETH
  const convertUSDToETH = async (usdAmount: string): Promise<string> => {
    try {
      const contract = getContract();
      const usdAmountFormatted = ethers.parseUnits(usdAmount, 8);
      const ethAmount = await contract.convertUSDToETH(usdAmountFormatted);
      return ethers.formatEther(ethAmount);
    } catch (error: any) {
      console.error('Error converting USD to ETH:', error);
      throw new Error(`Failed to convert USD to ETH: ${error.message || 'Unknown error'}`);
    }
  };

  // Convert ETH to USD
  const convertETHToUSD = async (ethAmount: string): Promise<string> => {
    try {
      const contract = getContract();
      const ethAmountFormatted = ethers.parseEther(ethAmount);
      const usdAmount = await contract.convertETHToUSD(ethAmountFormatted);
      return ethers.formatUnits(usdAmount, 8);
    } catch (error: any) {
      console.error('Error converting ETH to USD:', error);
      throw new Error(`Failed to convert ETH to USD: ${error.message || 'Unknown error'}`);
    }
  };



// ========== ACTIVITY POINTS FUNCTIONS ==========

// Get user activity points
const getUserActivityPoints = async (userAddress?: string): Promise<string> => {
  try {
    const contract = getContract();
    const address = userAddress || account;
    
    if (!address) throw new Error('No address provided');
    
    const points = await contract.getUserActivityPoints(address);
    return points.toString();
  } catch (error: any) {
    console.error('Error getting user activity points:', error);
    throw new Error(`Failed to get user activity points: ${error.message || 'Unknown error'}`);
  }
};

// ========== ADDITIONAL VIEW FUNCTIONS ==========

// Get all tokens
const getAllTokens = async (): Promise<string[]> => {
  try {
    const contract = getContract();
    const tokens = await contract.getAllTokens();
    return tokens.map((token: bigint) => token.toString());
  } catch (error: any) {
    console.error('Error getting all tokens:', error);
    throw new Error(`Failed to get all tokens: ${error.message || 'Unknown error'}`);
  }
};

// Get total minted count
const totalMinted = async (): Promise<string> => {
  try {
    const contract = getContract();
    const total = await contract.totalMinted();
    return total.toString();
  } catch (error: any) {
    console.error('Error getting total minted:', error);
    throw new Error(`Failed to get total minted: ${error.message || 'Unknown error'}`);
  }
};

// Get token URI
const tokenURI = async (tokenId: string): Promise<string> => {
  try {
    const contract = getContract();
    return await contract.tokenURI(tokenId);
  } catch (error: any) {
    console.error('Error getting token URI:', error);
    throw new Error(`Failed to get token URI: ${error.message || 'Unknown error'}`);
  }
};

// Get owner of token
const ownerOf = async (tokenId: string): Promise<string> => {
  try {
    const contract = getContract();
    return await contract.ownerOf(tokenId);
  } catch (error: any) {
    console.error('Error getting owner of token:', error);
    throw new Error(`Failed to get owner of token: ${error.message || 'Unknown error'}`);
  }
};

// Get balance of user
const balanceOf = async (userAddress?: string): Promise<string> => {
  try {
    const contract = getContract();
    const address = userAddress || account;
    
    if (!address) throw new Error('No address provided');
    
    const balance = await contract.balanceOf(address);
    return balance.toString();
  } catch (error: any) {
    console.error('Error getting balance of user:', error);
    throw new Error(`Failed to get balance of user: ${error.message || 'Unknown error'}`);
  }
};

// Get NFT contract address
const getNftContractAddress = async (): Promise<string> => {
  try {
    const contract = getContract();
    return await contract.getNftContractAddress();
  } catch (error: any) {
    console.error('Error getting NFT contract address:', error);
    throw new Error(`Failed to get NFT contract address: ${error.message || 'Unknown error'}`);
  }
};

// Get lending contract address
const getLendingContractAddress = async (): Promise<string> => {
  try {
    const contract = getContract();
    return await contract.getLendingContractAddress();
  } catch (error: any) {
    console.error('Error getting lending contract address:', error);
    throw new Error(`Failed to get lending contract address: ${error.message || 'Unknown error'}`);
  }
};

// NEW: Get price feed contract address
const getPriceFeedAddress = async (): Promise<string> => {
  try {
    const contract = getContract();
    return await contract.getPriceFeedAddress();
  } catch (error: any) {
    console.error('Error getting price feed contract address:', error);
    throw new Error(`Failed to get price feed contract address: ${error.message || 'Unknown error'}`);
  }
};

// Get NFT collection name
const name = async (): Promise<string> => {
  try {
    const contract = getContract();
    return await contract.name();
  } catch (error: any) {
    console.error('Error getting collection name:', error);
    throw new Error(`Failed to get collection name: ${error.message || 'Unknown error'}`);
  }
};

// Get NFT collection symbol
const symbol = async (): Promise<string> => {
  try {
    const contract = getContract();
    return await contract.symbol();
  } catch (error: any) {
    console.error('Error getting collection symbol:', error);
    throw new Error(`Failed to get collection symbol: ${error.message || 'Unknown error'}`);
  }
};

  // Return all the functions
  return {
    getLatestPrice,
    convertUSDToETH,
    convertETHToUSD,
    getUserActivityPoints,
    getAllTokens,
    totalMinted,
    tokenURI,
    ownerOf,
    balanceOf,
    getNftContractAddress,
    getLendingContractAddress,
    getPriceFeedAddress,
    name,
    symbol
  };
};
