import { ethers } from 'ethers';
import { NFTData, NFTSale, ActiveSalesData } from "./interfaces";

// Export function factory that takes dependencies and returns the functions
export const createAssetFunctions = (
  getContract: () => ethers.Contract,
  fetchNFTMetadata: (contract: any, tokenId: string) => Promise<{name: string, imageUrl: string, proofOfOwnership: string}>,
  account: string | null
) => {
  // ========== NFT FUNCTIONS ==========
  
  // Simple mintNFT function
  const mintNFT = async (uri: string): Promise<string> => {
    try {
      const contract = getContract();
      
      // Call the mint function - it returns the tokenId directly
      const tx = await contract.mint(uri);
      console.log('Transaction sent:', tx.hash);
      
      // Wait for transaction to be mined
      await tx.wait();
      console.log('Transaction confirmed');
      
      return "success";
      
    } catch (error: any) {
      console.error('Error minting NFT:', error);
      throw new Error(`Failed to mint NFT: ${error.message || 'Unknown error'}`);
    }
  };
  
    // Create sale function - takes USD price
    const createSale = async (tokenId: string, priceUSD: string): Promise<void> => {
      try {
        const contract = getContract();
        // Convert USD to 8 decimal format (e.g., "100.50" becomes "10050000000")
        const priceUSDFormatted = ethers.parseUnits(priceUSD, 8);
        const tx = await contract.createSale(tokenId, priceUSDFormatted);
        await tx.wait();
      } catch (error) {
        console.error('Error creating sale:', error);
        throw new Error('Failed to create sale');
      }
    };
  
    // Purchase NFT function - automatically gets the current ETH price
    const purchaseNFT = async (tokenId: string): Promise<void> => {
      try {
        const contract = getContract();
        console.log('=== PURCHASING NFT DEBUG ===');
        console.log('TokenId:', tokenId);
        console.log('Contract address:', contract.target);
        
        // Get the current ETH price for this sale
        const [ethPrice] = await contract.getSaleETHPrice(tokenId);
        console.log('Required ETH amount:', ethers.formatEther(ethPrice));
        
        const tx = await contract.purchaseNFT(tokenId, { value: ethPrice });
        console.log('Transaction sent:', tx.hash);
        await tx.wait();
        console.log('Transaction confirmed');
      } catch (error) {
        console.error('Error purchasing NFT:', error);
        throw new Error('Failed to purchase NFT');
      }
    };
  
    // Cancel sale function
    const cancelSale = async (tokenId: string): Promise<void> => {
      try {
        const contract = getContract();
        const tx = await contract.cancelSale(tokenId);
        await tx.wait();
      } catch (error) {
        console.error('Error cancelling sale:', error);
        throw new Error('Failed to cancel sale');
      }
    };
  
    const getSaleInfo = async (tokenId: string): Promise<NFTSale | null> => {
      try {
        const contract = getContract();
        const [seller, priceUSD, isActive] = await contract.getSaleInfo(tokenId);
  
        if (!isActive) {
          return null;
        }
  
        // Get current ETH price for this USD amount
        const [ethPrice] = await contract.getSaleETHPrice(tokenId);
  
        const metadata = await fetchNFTMetadata(contract, tokenId);
        
        return {
          tokenId,
          name: metadata.name,
          imageUrl: metadata.imageUrl,
          priceUSD: ethers.formatUnits(priceUSD, 8), // Format from 8 decimals
          priceETH: ethers.formatEther(ethPrice), // Format from 18 decimals
          priceUSDRaw: priceUSD.toString(),
          seller,
          proofOfOwnership: metadata.proofOfOwnership
        };
      } catch (error) {
        console.error('Error getting sale info:', error);
        return null;
      }
    };
  
    // Get current ETH price for a sale
    const getSaleETHPrice = async (tokenId: string): Promise<{ethPrice: string, priceUSD: string} | null> => {
      try {
        const contract = getContract();
        const [ethPriceWei, priceUSDRaw] = await contract.getSaleETHPrice(tokenId);
        
        return {
          ethPrice: ethers.formatEther(ethPriceWei),
          priceUSD: ethers.formatUnits(priceUSDRaw, 8)
        };
      } catch (error) {
        console.error('Error getting sale ETH price:', error);
        return null;
      }
    };
  
    const getUserNFTs = async (userAddress?: string): Promise<NFTData[]> => {
      try {
        const contract = getContract();
        const address = userAddress || account;
  
        if (!address) throw new Error('No address provided');
  
        const ownedTokenIds: bigint[] = await contract.getTokensOfOwner(address);
        const nfts: NFTData[] = [];
  
        for (const tokenId of ownedTokenIds) {
          try {
            const metadata = await fetchNFTMetadata(contract, tokenId.toString());
  
            nfts.push({
              tokenId: tokenId.toString(),
              name: metadata.name,
              imageUrl: metadata.imageUrl,
              owner: address,
              proofOfOwnership: metadata.proofOfOwnership
            });
          } catch (err) {
            console.warn(`Error processing token ${tokenId}`, err);
          }
        }
        console.log("from here", nfts);
        return nfts;
      } catch (error) {
        console.error('Error getting user NFTs:', error);
        return [];
      }
    };
  
    // Get NFTs listed for sale (all active sales)
    const getNFTsForSale = async (): Promise<NFTSale[]> => {
      try {
        const contract = getContract();
  
        const tokenIds: bigint[] = await contract.getTokensForSale();
        const sales: NFTSale[] = [];
  
        for (const tokenId of tokenIds) {
          try {
            const [seller, priceUSD, isActive] = await contract.getSaleInfo(tokenId);
            
            // Show all active sales, not just ones for a specific buyer
            if (isActive) {
              const metadata = await fetchNFTMetadata(contract, tokenId.toString());
              
              // Get current ETH price
              const [ethPriceWei] = await contract.getSaleETHPrice(tokenId);
              
              console.log(`Sale for token ${tokenId}:`, {
                seller,
                priceUSD: ethers.formatUnits(priceUSD, 8),
                priceETH: ethers.formatEther(ethPriceWei)
              });
              
              sales.push({
                tokenId: tokenId.toString(),
                name: metadata.name,
                imageUrl: metadata.imageUrl,
                priceUSD: ethers.formatUnits(priceUSD, 8),
                priceETH: ethers.formatEther(ethPriceWei),
                priceUSDRaw: priceUSD.toString(),
                seller: seller,
                proofOfOwnership: metadata.proofOfOwnership
              });
            }
          } catch (err) {
            console.warn(`Error fetching sale info for token ${tokenId}:`, err);
          }
        }
  
        return sales;
      } catch (error) {
        console.error('Error getting NFTs for sale:', error);
        return [];
      }
    };
  
    // Get all active sales in bulk
    const getAllActiveSales = async (): Promise<ActiveSalesData> => {
      try {
        const contract = getContract();
        const [tokenIds, sellers, pricesUSD, pricesETH] = await contract.getAllActiveSales();
        
        return {
          tokenIds: tokenIds.map((id: bigint) => id.toString()),
          sellers: sellers,
          pricesUSD: pricesUSD.map((price: bigint) => ethers.formatUnits(price, 8)),
          pricesETH: pricesETH.map((price: bigint) => ethers.formatEther(price))
        };
      } catch (error: any) {
        console.error('Error getting all active sales:', error);
        throw new Error(`Failed to get all active sales: ${error.message || 'Unknown error'}`);
      }
    };

    // Return all the functions
    return {
      mintNFT,
      createSale,
      purchaseNFT,
      cancelSale,
      getSaleInfo,
      getSaleETHPrice,
      getUserNFTs,
      getNFTsForSale,
      getAllActiveSales
    };
  };