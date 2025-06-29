'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '../WalletContext'; // adjust the path if needed
import { NFTSale } from '../interfaces';
import BackButton from '../components/BackButton';
import NFTWithProof from '../components/NFTWithProof';
import './buy.css';

const BuyNFTView: React.FC = () => {
  const [sales, setSales] = useState<NFTSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingSales, setFetchingSales] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  
  const { account, isConnected, signer, getNFTsForSale, getSaleInfo, purchaseNFT } = useWallet();

  // Fetch NFTs when component mounts or wallet connects
  useEffect(() => {
    if (isConnected && account) {
      fetchAllNFTSales();
    }
  }, [isConnected, account]);
  const fetchAllNFTSales = async () => {
    try {
      setFetchingSales(true);
      
      // Fetch all NFTs on sale
      const allSales = await getNFTsForSale();
      
      // Filter out sales by the current user (they can't buy their own NFTs)
      const availableForPurchase = allSales.filter(sale => 
        sale.seller.toLowerCase() !== account?.toLowerCase()
      );
      
      setSales(availableForPurchase);
      console.log('Available sales:', availableForPurchase);
      
    } catch (error) {
      console.error('Error fetching NFT sales:', error);
    } finally {
      setFetchingSales(false);
    }
  };  const handleBuyNFT = async (tokenId: string) => {
    try {
      setLoading(true);
      setMessage('');
      await purchaseNFT(tokenId);
      
      // Refresh both sales lists after successful purchase
      await fetchAllNFTSales();
      
      setMessage('NFT purchased successfully!');
      setMessageType('success');
      // Hide the message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error purchasing NFT:', error);
      setMessage('Failed to purchase NFT. Please try again.');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };
  



  const renderNFTGrid = (sales: NFTSale[]) => {
    if (sales.length === 0) {
      return (
        <div className="empty-state">
          <p className="empty-state-text">
            No Assets are currently for sale.
          </p>
          <button
            onClick={fetchAllNFTSales}
            className="btn-primary"
          >
            Refresh Sales
          </button>
        </div>
      );
    }

    return (
      <div className="nft-grid">
        {sales.map((sale) => (
          <article key={sale.tokenId} className="nft-card">
            {sale.imageUrl && (
              <NFTWithProof
                name={sale.name || `NFT #${sale.tokenId}`}
                imageUrl={sale.imageUrl}
                proofOfOwnership={sale.proofOfOwnership || ''}
                tokenId={sale.tokenId}
                size="medium"
                className="nft-image-container"
              />
            )}
            
            <header className="nft-card-header">
              <div className="nft-price">
                Price: ${sale.priceUSD} (≈{sale.priceETH} ETH)
              </div>
            </header>

            <footer className="action-row">
              <button
                onClick={() => handleBuyNFT(sale.tokenId)}
                disabled={loading || !isConnected}
                className="btn-purchase"
              >
                {loading ? 'Purchasing...' : 
                 `Buy for $${sale.priceUSD}`}
              </button>
            </footer>
          </article>
        ))}
      </div>
    );
  };
  return (
    <div className="marketplace-container">
      <BackButton />
      <header className="page-header">
        <h1 className="page-title">Buy Assets</h1>
      </header>

      {message && (
        <div className={`success-message ${messageType}`}>
          {message}
        </div>
      )}

      {!isConnected ? (
        <div className="wallet-prompt">
          <p className="section-text">Please connect your wallet to view Assets for sale.</p>
        </div>
      ) : (
        <main className="marketplace-content">
          <h2 className="section-title">Available Assets for Sale ({sales.length})</h2>

          {/* Controls Section */}
          <section className="controls-section">
            <button
              onClick={fetchAllNFTSales}
              disabled={fetchingSales}
              className="btn-secondary"
              aria-label="Refresh Asset sales data"
            >
              {fetchingSales ? 'Refreshing...' : 'Refresh Sales'}
            </button>
          </section>

          {/* Content based on active tab */}
          <section className="marketplace-listings">
            {fetchingSales ? (
              <div className="loading-state">
                <div className="loading-shimmer">
                  <p className="secondary-text">Loading NFTs...</p>
                </div>
              </div>
            ) : (
              <div className="tab-content">
                {renderNFTGrid(sales)}
              </div>
            )}
          </section>
        </main>
      )}
    </div>
  );
};

export default BuyNFTView;