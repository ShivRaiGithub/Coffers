'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '../WalletContext';
import { useRouter } from 'next/navigation';
import { NFTData, NFTSale, LoanRequest } from '../interfaces';
import BackButton from '../components/BackButton';
import NFTWithProof from '../components/NFTWithProof';
import './view.css';

const ViewNFTsPage: React.FC = () => {
  const router = useRouter();
  const [ownedNFTs, setOwnedNFTs] = useState<NFTData[]>([]);
  const [listedNFTs, setListedNFTs] = useState<NFTSale[]>([]);
  const [loanedNFTs, setLoanedNFTs] = useState<LoanRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'owned' | 'listed' | 'loans'>('owned');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { 
    isConnected, 
    account, 
    getUserNFTs, 
    getNFTsForSale, 
    getAllActiveLoans 
  } = useWallet();

  useEffect(() => {
    if (isConnected && account) {
      fetchAllUserAssets();
    }
  }, [isConnected, account]);

  const fetchAllUserAssets = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch owned NFTs
      const userNFTs = await getUserNFTs();
      setOwnedNFTs(userNFTs);

      // Fetch listed NFTs (user's sales)
      const allSales = await getNFTsForSale();
      const userSales = allSales.filter(sale => 
        sale.seller.toLowerCase() === account?.toLowerCase()
      );
      setListedNFTs(userSales);

      // Fetch loans if the function exists
      if (getAllActiveLoans) {
        try {
          const allLoans = await getAllActiveLoans();
          // Filter loans where the user is the borrower and the loan is active
          const userLoans = allLoans.filter(loan => 
            loan.borrower.toLowerCase() === account?.toLowerCase()
          );
          setLoanedNFTs(userLoans);
        } catch (loanError) {
          console.log('Loans feature not available:', loanError);
        }
      }

    } catch (err) {
      console.error('Error fetching user assets:', err);
      setError('Failed to load your assets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAllUserAssets();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'owned':
        return (
          <div className="nft-grid">
            {ownedNFTs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎨</div>
                <h3>No Assets Owned</h3>
                <p>You don't own any tokenized assets yet. Start by creating your first asset!</p>
                <button 
                  onClick={() => router.push('/create')} 
                  className="create-asset-button"
                >
                  🎨 Create Your First Asset
                </button>
              </div>
            ) : (
              ownedNFTs.map((nft) => (
                <div key={nft.tokenId} className="nft-card">
                  <NFTWithProof
                    name={nft.name}
                    imageUrl={nft.imageUrl}
                    proofOfOwnership={nft.proofOfOwnership || ''}
                    tokenId={nft.tokenId}
                  />
                  <div className="nft-info">
                    <h4 className="nft-name">{nft.name}</h4>
                    <p className="nft-id">Token ID: {nft.tokenId}</p>
                    <div className="nft-status owned">
                      <span className="status-indicator"></span>
                      Owned
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      
      case 'listed':
        return (
          <div className="nft-grid">
            {listedNFTs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💰</div>
                <h3>No Assets Listed</h3>
                <p>You haven't listed any assets for sale yet. Go to the sell page to list your assets!</p>
                <button 
                  onClick={() => router.push('/sell')} 
                  className="create-asset-button"
                >
                  💰 List Assets for Sale
                </button>
              </div>
            ) : (
              listedNFTs.map((sale) => (
                <div key={sale.tokenId} className="nft-card">
                  <NFTWithProof
                    name={sale.name}
                    imageUrl={sale.imageUrl}
                    proofOfOwnership={sale.proofOfOwnership || ''}
                    tokenId={sale.tokenId}
                  />
                  <div className="nft-info">
                    <h4 className="nft-name">{sale.name}</h4>
                    <p className="nft-id">Token ID: {sale.tokenId}</p>
                    <div className="price-info">
                      <span className="price-usd">${sale.priceUSD}</span>
                      <span className="price-eth">{sale.priceETH} ETH</span>
                    </div>
                    <div className="nft-status listed">
                      <span className="status-indicator"></span>
                      Listed for Sale
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      
      case 'loans':
        return (
          <div className="nft-grid">
            {loanedNFTs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏦</div>
                <h3>No Active Loans</h3>
                <p>You don't have any assets used as collateral for loans currently.</p>
                <button 
                  onClick={() => router.push('/loan')} 
                  className="create-asset-button"
                >
                  🏦 Get a Loan
                </button>
              </div>
            ) : (
              loanedNFTs.map((loan) => (
                <div key={loan.tokenId} className="nft-card">
                  {loan.imageUrl && (
                    <NFTWithProof
                      name={loan.name || `Asset #${loan.tokenId}`}
                      imageUrl={loan.imageUrl}
                      proofOfOwnership={loan.proofOfOwnership || ''}
                      tokenId={loan.tokenId}
                    />
                  )}
                  <div className="loan-info">
                    <h4 className="nft-name">{loan.name || `Asset #${loan.tokenId}`}</h4>
                    <p className="nft-id">Token ID: {loan.tokenId}</p>
                    <div className="loan-details">
                      <div className="loan-amount">
                        <span className="label">Loan Amount:</span>
                        <span className="value">{loan.loanAmount} ETH</span>
                      </div>
                      <div className="deadline">
                        <span className="label">Deadline:</span>
                        <span className="value">{new Date(loan.deadline * 1000).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className={`nft-status ${loan.isFunded ? 'loaned' : 'pending'}`}>
                      <span className="status-indicator"></span>
                      {loan.isFunded ? 'Funded Loan' : 'Pending Funding'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  if (!isConnected) {
    return (
      <div className="view-container">
        <div className="background-overlay"></div>
        <BackButton />
        <div className="not-connected">
          <div className="not-connected-content">
            <div className="not-connected-icon">👛</div>
            <h2>Wallet Not Connected</h2>
            <p>Please connect your wallet to view your assets.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div className="background-overlay"></div>
      
      <BackButton />
      
      <div className="view-content">
        {/* Header */}
        <div className="view-header">
          <h1 className="view-title">
            My <span className="title-highlight">Assets</span>
          </h1>
          <p className="view-description">
            View and manage all your tokenized assets, sales listings, and loan collateral.
          </p>
          <button onClick={handleRefresh} className="refresh-button" disabled={loading}>
            <span className="refresh-icon">🔄</span>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'owned' ? 'active' : ''}`}
              onClick={() => setActiveTab('owned')}
            >
              <span className="tab-icon">🎨</span>
              Owned Assets
              <span className="tab-count">{ownedNFTs.length}</span>
            </button>
            <button
              className={`tab ${activeTab === 'listed' ? 'active' : ''}`}
              onClick={() => setActiveTab('listed')}
            >
              <span className="tab-icon">💰</span>
              Listed for Sale
              <span className="tab-count">{listedNFTs.length}</span>
            </button>
            <button
              className={`tab ${activeTab === 'loans' ? 'active' : ''}`}
              onClick={() => setActiveTab('loans')}
            >
              <span className="tab-icon">🏦</span>
              Loan Collateral
              <span className="tab-count">{loanedNFTs.length}</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Content */}
        <div className="tab-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading your assets...</p>
            </div>
          ) : (
            renderTabContent()
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewNFTsPage;
