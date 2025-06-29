'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import CONTRACT_ABI from "./abi.json";
import { NFTData, NFTSale, ActiveSalesData, LoanData, LoanDataWithUSD, LoanRequest } from "./interfaces";
import { createAssetFunctions } from "./WalletContextAssets";
import { createLoanFunctions } from "./WalletContextLoan";
import { createViewFunctions } from "./WalletContextView";


const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

interface WalletContextType {
  // State
  account: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  
  // Functions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  getBalance: () => Promise<string>;
  
  // Price Feed Functions
  getLatestPrice: () => Promise<string>;
  convertUSDToETH: (usdAmount: string) => Promise<string>;
  convertETHToUSD: (ethAmount: string) => Promise<string>;

  // NFT Contract Functions
  mintNFT: (uri: string) => Promise<string>;
  createSale: (tokenId: string, priceUSD: string) => Promise<void>;
  purchaseNFT: (tokenId: string) => Promise<void>;
  cancelSale: (tokenId: string) => Promise<void>;
  getSaleInfo: (tokenId: string) => Promise<NFTSale | null>;
  getSaleETHPrice: (tokenId: string) => Promise<{ethPrice: string, priceUSD: string} | null>;
  getUserNFTs: (userAddress?: string) => Promise<NFTData[]>;
  getNFTsForSale: (buyerAddress?: string) => Promise<NFTSale[]>;
  getAllActiveSales: () => Promise<ActiveSalesData>;
  
  
  // Loan Functions
  requestLoan: (tokenId: string, loanAmountUSD: string, durationInDays: number) => Promise<void>;
  fundLoan: (tokenId: string) => Promise<void>;
  repayLoan: (tokenId: string) => Promise<void>;
  liquidateAsset: (tokenId: string) => Promise<void>;
  cancelLoanRequest: (tokenId: string) => Promise<void>;
  getLoanInfo: (tokenId: string) => Promise<LoanData | null>;
  getLoanInfoWithUSD: (tokenId: string) => Promise<LoanDataWithUSD | null>;
  getAllActiveLoans: () => Promise<LoanRequest[]>;
  getTokensForLoan: () => Promise<string[]>;
  isLoanExpired: (tokenId: string) => Promise<boolean>;
  getLiquidatableTokens: () => Promise<string[]>;
  getTotalRepaymentAmount: (tokenId: string) => Promise<string>;
  getTotalRepaymentAmountWithUSD: (tokenId: string) => Promise<{ethAmount: string, usdAmount: string}>;
  checkAndPrepareLiquidations: () => Promise<string[]>;
  
  // Activity Points Functions
  getUserActivityPoints: (userAddress?: string) => Promise<string>;
  
  // Additional View Functions
  getAllTokens: () => Promise<string[]>;
  totalMinted: () => Promise<string>;
  tokenURI: (tokenId: string) => Promise<string>;
  ownerOf: (tokenId: string) => Promise<string>;
  balanceOf: (userAddress?: string) => Promise<string>;
  getNftContractAddress: () => Promise<string>;
  getLendingContractAddress: () => Promise<string>;
  getPriceFeedAddress: () => Promise<string>;
  name: () => Promise<string>;
  symbol: () => Promise<string>;
}

interface WalletProviderProps {
  children: React.ReactNode;
}

// Create context with undefined as default
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Wallet Provider Component
export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [chainId, setChainId] = useState<number | null>(null);

  // Check if wallet is already connected on component mount
  useEffect(() => {
    checkConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== account) {
          setAccount(accounts[0]);
          initializeProvider();
        }
      };

      const handleChainChanged = (chainId: string) => {
        setChainId(parseInt(chainId, 16));
        window.location.reload(); // Recommended by MetaMask
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [account]);

  // Check if wallet is already connected
  const checkConnection = async (): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const network = await provider.getNetwork();
          
          setAccount(accounts[0].address);
          setProvider(provider);
          setSigner(signer);
          setChainId(Number(network.chainId));
          setIsConnected(true);
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  // Initialize provider and signer
  const initializeProvider = async (): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const network = await provider.getNetwork();
        
        setProvider(provider);
        setSigner(signer);
        setChainId(Number(network.chainId));
      }
    } catch (error) {
      console.error('Error initializing provider:', error);
    }
  };

  // Connect wallet function - connects to whatever network user is currently on
  const connectWallet = async (): Promise<void> => {
    try {
      setIsConnecting(true);
      
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts returned from MetaMask');
      }

      // Initialize provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      setAccount(accounts[0]);
      setProvider(provider);
      setSigner(signer);
      setChainId(Number(network.chainId));
      setIsConnected(true);

      console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);

    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      if (error.code === 4001) {
        throw new Error('Please connect to MetaMask');
      } else {
        throw new Error('Failed to connect wallet');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet function
  const disconnectWallet = (): void => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setIsConnected(false);
    setChainId(null);
  };

  // Get wallet balance
  const getBalance = async (): Promise<string> => {
    try {
      if (!provider || !account) {
        throw new Error('Wallet not connected');
      }
      
      const balance = await provider.getBalance(account);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      throw new Error('Failed to get balance');
    }
  };

  // Get contract instance
  const getContract = () => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }
    return new ethers.Contract(CONTRACT_ADDRESS!, CONTRACT_ABI, signer);
  };

  // Helper function to fetch NFT metadata
  const fetchNFTMetadata = async (contract: any, tokenId: string) => {
    try {
      const uri = await contract.tokenURI(tokenId);
      let metadata = { name: `NFT #${tokenId}`, image: '', proof_of_ownership: '' };

      if (uri.startsWith('http')) {
        try {
          const res = await fetch(uri);
          metadata = await res.json();
        } catch {
          console.warn(`Failed to fetch metadata for token ${tokenId}`);
        }
      }

      return {
        name: metadata.name || `NFT #${tokenId}`,
        imageUrl: metadata.image || '',
        proofOfOwnership: metadata.proof_of_ownership || ''
      };
    } catch (error) {
      return {
        name: `NFT #${tokenId}`,
        imageUrl: '',
        proofOfOwnership: ''
      };
    }
  };

  // Create function instances
  const assetFunctions = createAssetFunctions(getContract, fetchNFTMetadata, account);
  const loanFunctions = createLoanFunctions(getContract, fetchNFTMetadata, signer);
  const viewFunctions = createViewFunctions(getContract, account);

  
const contextValue: WalletContextType = {
  // State
  account,
  provider,
  signer,
  isConnected,
  isConnecting,
  chainId,
  
  // Functions
  connectWallet,
  disconnectWallet,
  getBalance,
  
  // Price Feed Functions
  getLatestPrice: viewFunctions.getLatestPrice,
  convertUSDToETH: viewFunctions.convertUSDToETH,
  convertETHToUSD: viewFunctions.convertETHToUSD,
  
  // NFT Contract Functions
  mintNFT: assetFunctions.mintNFT,
  createSale: assetFunctions.createSale,
  purchaseNFT: assetFunctions.purchaseNFT,
  cancelSale: assetFunctions.cancelSale,
  getSaleInfo: assetFunctions.getSaleInfo,
  getSaleETHPrice: assetFunctions.getSaleETHPrice,
  getUserNFTs: assetFunctions.getUserNFTs,
  getNFTsForSale: assetFunctions.getNFTsForSale,
  getAllActiveSales: assetFunctions.getAllActiveSales,
  
  // Loan Functions
  requestLoan: loanFunctions.requestLoan,
  fundLoan: loanFunctions.fundLoan,
  repayLoan: loanFunctions.repayLoan,
  liquidateAsset: loanFunctions.liquidateAsset,
  cancelLoanRequest: loanFunctions.cancelLoanRequest,
  getLoanInfo: loanFunctions.getLoanInfo,
  getLoanInfoWithUSD: loanFunctions.getLoanInfoWithUSD,
  getAllActiveLoans: loanFunctions.getAllActiveLoans,
  getTokensForLoan: loanFunctions.getTokensForLoan,
  isLoanExpired: loanFunctions.isLoanExpired,
  getLiquidatableTokens: loanFunctions.getLiquidatableTokens,
  getTotalRepaymentAmount: loanFunctions.getTotalRepaymentAmount,
  getTotalRepaymentAmountWithUSD: loanFunctions.getTotalRepaymentAmountWithUSD,
  checkAndPrepareLiquidations: loanFunctions.checkAndPrepareLiquidations,
  
  // Activity Points Functions
  getUserActivityPoints: viewFunctions.getUserActivityPoints,
  
  // Additional View Functions
  getAllTokens: viewFunctions.getAllTokens,
  totalMinted: viewFunctions.totalMinted,
  tokenURI: viewFunctions.tokenURI,
  ownerOf: viewFunctions.ownerOf,
  balanceOf: viewFunctions.balanceOf,
  getNftContractAddress: viewFunctions.getNftContractAddress,
  getLendingContractAddress: viewFunctions.getLendingContractAddress,
  getPriceFeedAddress: viewFunctions.getPriceFeedAddress,
  name: viewFunctions.name,
  symbol: viewFunctions.symbol,
};

return (
  <WalletContext.Provider value={contextValue}>
    {children}
  </WalletContext.Provider>
);
};


export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}