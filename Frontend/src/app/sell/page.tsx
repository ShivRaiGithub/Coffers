'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '../WalletContext';
import { NFTData, NFTSale } from '../interfaces';
import './sell.css';
import BackButton from '../components/BackButton';
import NFTWithProof from '../components/NFTWithProof';

const SellNFTView: React.FC = () => {
  const [selectedNFT, setSelectedNFT] = useState<NFTData | null>(null);
  const [price, setPrice] = useState('');
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [userSales, setUserSales] = useState<NFTSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingNFTs, setFetchingNFTs] = useState(false);
  const [fetchingSales, setFetchingSales] = useState(false);
  const [cancelingToken, setCancelingToken] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const { isConnected, account, getUserNFTs, createSale, cancelSale, getNFTsForSale } = useWallet();
  useEffect(() => {
    if (isConnected) {
      fetchUserNFTs();
      fetchUserSales();
    }
  }, [isConnected]);
  const fetchUserNFTs = async () => {
    try {
      setFetchingNFTs(true);
      const userNFTs = await getUserNFTs();
      console.log("nfts are", userNFTs);
      setNfts(userNFTs);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
    } finally {
      setFetchingNFTs(false);
    }
  };

  const fetchUserSales = async () => {
    try {
      setFetchingSales(true);
      const allSales = await getNFTsForSale();
      // Filter sales to only show those owned by the current user
      const userOwnedSales = allSales.filter(sale => sale.seller.toLowerCase() === account?.toLowerCase());
      setUserSales(userOwnedSales);
    } catch (error) {
      console.error('Error fetching user sales:', error);
    } finally {
      setFetchingSales(false);
    }
  };

  const handleCancelSale = async (tokenId: string) => {
    try {
      setCancelingToken(tokenId);
      setSuccessMessage('');
      await cancelSale(tokenId);
      await fetchUserNFTs();
      await fetchUserSales();
      setSuccessMessage('NFT sale successfully canceled!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error canceling sale:', error);
      setSuccessMessage('Failed to cancel sale. Please try again.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setCancelingToken(null);
    }
  };  const handlePutForSale = async (tokenId: string, price: string) => {
    try {
      setLoading(true);
      setSuccessMessage('');
      await createSale(tokenId, price);
      setSelectedNFT(null);
      setPrice('');
      await fetchUserNFTs();
      await fetchUserSales();
      setSuccessMessage('NFT successfully put up for sale!');
      // Hide the success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error creating sale:', error);
      setSuccessMessage('Failed to create sale. Please try again.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return;
    if (selectedNFT && price) {
      handlePutForSale(selectedNFT.tokenId, price);
    }
  };

  return (    <div className="marketplace-container">
      <BackButton />
      <div className="background-overlay"></div>
      <h2 className="page-title">Put NFT for Sale</h2>      {successMessage && (
        <div className={`success-message ${successMessage.includes('Failed') ? 'error' : 'success'}`}>
          {successMessage}
        </div>
      )}

      {/* Cancel Sales Section */}
      {isConnected && userSales.length > 0 && (
        <div className="cancel-sales-section">
          <h3 className="section-title">Your Active Sales</h3>
          {fetchingSales ? (
            <div className="status-message status-message--loading">
              <p>Loading your sales...</p>
            </div>
          ) : (
            <div className="sales-grid">
              {userSales.map((sale) => (
                <div key={sale.tokenId} className="sale-item">
                  {sale.imageUrl && (
                    <NFTWithProof
                      name={sale.name}
                      imageUrl={sale.imageUrl}
                      proofOfOwnership={sale.proofOfOwnership || ''}
                      tokenId={sale.tokenId}
                      size="medium"
                      className="sale-image-container"
                    />
                  )}
                  <div className="sale-info">
                    <h4 className="sale-name">{sale.name}</h4>
                    <p className="sale-token-id">Token ID: {sale.tokenId}</p>
                    <p className="sale-price">Price: ${sale.priceUSD} (≈{sale.priceETH} ETH)</p>
                    <button
                      onClick={() => handleCancelSale(sale.tokenId)}
                      disabled={cancelingToken === sale.tokenId}
                      className={`btn btn-danger ${cancelingToken === sale.tokenId ? 'disabled' : ''}`}
                    >
                      {cancelingToken === sale.tokenId ? 'Canceling...' : 'Cancel Sale'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isConnected ? (
        <div className="wallet-prompt">
          <p>Please connect your wallet to list NFTs for sale.</p>
        </div>
      ) : fetchingNFTs ? (
        <div className="status-message status-message--loading">
          <p>Loading your NFTs...</p>
        </div>
      ) : nfts.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-text">You don't own any NFTs yet.</p>
          <button onClick={() => { fetchUserNFTs(); fetchUserSales(); }} className="refresh-button">
            Refresh NFTs
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-section">
            <label className="form-label">Select NFT to Sell:</label>
            <div className="nft-grid">
              {nfts.map((nft) => (
                <button
                  key={nft.tokenId}
                  type="button"
                  onClick={() => setSelectedNFT(nft)}
                  className={`nft-item ${selectedNFT?.tokenId === nft.tokenId ? 'selected' : ''}`}
                >
                  {nft.imageUrl && (
                    <NFTWithProof
                      name={nft.name}
                      imageUrl={nft.imageUrl}
                      proofOfOwnership={nft.proofOfOwnership || ''}
                      tokenId={nft.tokenId}
                      size="small"
                      showLabels={false}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>          {selectedNFT && (
            <div className="form-section">
              <label className="form-label">Selected NFT:</label>
              <div className="nft-item selected">
                <div className="nft-images-container">
                  {selectedNFT.imageUrl && (
                    <NFTWithProof
                      name={selectedNFT.name}
                      imageUrl={selectedNFT.imageUrl}
                      proofOfOwnership={selectedNFT.proofOfOwnership || ''}
                      tokenId={selectedNFT.tokenId}
                      size="medium"
                      className="nft-main-image"
                    />
                  )}
                </div>
              </div>
            </div>
          )}          <div className="form-section">
            <label className="form-label">Price (USD):</label>
            <div className="price-input-container">
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="form-input price-input"
                placeholder="100.00"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedNFT || !price}
            className={`btn btn-primary ${loading ? 'disabled' : ''}`}
          >
            {loading ? 'Creating Sale...' : 'Put for Sale'}
          </button>
        </form>
      )}
    </div>
  );
};

export default SellNFTView;
