'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '../WalletContext';
import { LoanRequest, LoanData, LoanDataWithUSD, NFTData } from '../interfaces';
import './loan.css';
import BackButton from '../components/BackButton';
import NFTWithProof from '../components/NFTWithProof';

const LoanView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'request' | 'browse' | 'manage' | 'liquidation'>('request');
  const [userNFTs, setUserNFTs] = useState<NFTData[]>([]);
  const [allLoans, setAllLoans] = useState<LoanRequest[]>([]);
  const [userLoans, setUserLoans] = useState<LoanData[]>([]);
  const [userLiquidatableLoans, setUserLiquidatableLoans] = useState<LoanData[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  
  // Form states for requesting loan
  const [selectedTokenId, setSelectedTokenId] = useState('');
  const [loanAmount, setLoanAmount] = useState(''); // Now in USD
  const [loanDuration, setLoanDuration] = useState('');
  
  const [ethPrice, setEthPrice] = useState<string>('');

  const { 
    account, 
    isConnected, 
    getUserNFTs, 
    getAllActiveLoans, 
    requestLoan, 
    fundLoan, 
    repayLoan, 
    liquidateAsset, 
    cancelLoanRequest, 
    getLoanInfo,
    getLoanInfoWithUSD,
    isLoanExpired,
    getLiquidatableTokens,
    getTotalRepaymentAmount,
    getTotalRepaymentAmountWithUSD,
    checkAndPrepareLiquidations,
    getLatestPrice,
    convertETHToUSD,
    convertUSDToETH
  } = useWallet();
  useEffect(() => {
    if (isConnected && account) {
      fetchAllData();
      fetchEthPrice();
    }
  }, [isConnected, account]);

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const showMessage = (text: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setMessage({ text, type });
  };

  const fetchEthPrice = async () => {
    try {
      const price = await getLatestPrice();
      setEthPrice(price);
    } catch (error) {
      console.error('Error fetching ETH price:', error);
    }
  };

  const fetchAllData = async () => {
    try {
      setFetchingData(true);
      
      // Fetch user's NFTs
      const nfts = await getUserNFTs();
      setUserNFTs(nfts);
      
      // Fetch all active loans
      const loans = await getAllActiveLoans();
      setAllLoans(loans);
      
      // Fetch user's active loans (as borrower or lender)
      const userActiveLoans: LoanData[] = [];
      const liquidatableLoans: LoanData[] = [];
      
      for (const loan of loans) {
        if (loan.isFunded) {
          const loanInfo = await getLoanInfo(loan.tokenId);
          if (loanInfo) {
            // Include loans where user is borrower or lender
            if (loanInfo.borrower.toLowerCase() === account!.toLowerCase() || 
                loanInfo.lender.toLowerCase() === account!.toLowerCase()) {
              userActiveLoans.push(loanInfo);
            }
            
            // Check if loan is expired for liquidation
            const isExpired = await isLoanExpired(loan.tokenId);
            if (isExpired) {
              liquidatableLoans.push(loanInfo);
            }
          }
        }
      }
      
      setUserLoans(userActiveLoans);
      setUserLiquidatableLoans(liquidatableLoans);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setFetchingData(false);
    }
  };

  const handleRequestLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const durationInDays = parseInt(loanDuration);
      await requestLoan(selectedTokenId, loanAmount, durationInDays); // loanAmount is now in USD
      
      // Reset form
      setSelectedTokenId('');
      setLoanAmount('');
      setLoanDuration('');
      
      // Refresh data
      await fetchAllData();
      showMessage('Loan request created successfully!', 'success');
    } catch (error) {
      console.error('Error requesting loan:', error);
      showMessage('Failed to request loan. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };
  const handleFundLoan = async (tokenId: string) => {
    try {
      setLoading(true);
      await fundLoan(tokenId); // Updated to match new API
      await fetchAllData();
      showMessage('Loan funded successfully!', 'success');
    } catch (error) {
      console.error('Error funding loan:', error);
      showMessage('Failed to fund loan. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRepayLoan = async (tokenId: string) => {
    try {
      setLoading(true);
      await repayLoan(tokenId); // Updated to match new API
      await fetchAllData();
      showMessage('Loan repaid successfully!', 'success');
    } catch (error) {
      console.error('Error repaying loan:', error);
      showMessage('Failed to repay loan. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLiquidateLoan = async (tokenId: string) => {
    try {
      setLoading(true);
      await liquidateAsset(tokenId); // Updated function name
      await fetchAllData();
      showMessage('Loan liquidated successfully!', 'success');
    } catch (error) {
      console.error('Error liquidating loan:', error);
      showMessage('Failed to liquidate loan. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // const handleSelfLiquidate = async (tokenId: string) => {
  //   try {
  //     setLoading(true);
  //     // Borrower can liquidate their own loan to avoid penalty
  //     await liquidateAsset(tokenId);
  //     await fetchAllData();
  //     showMessage('Self-liquidation completed successfully!', 'warning');
  //   } catch (error) {
  //     console.error('Error self-liquidating loan:', error);
  //     showMessage('Failed to self-liquidate loan. Please try again.', 'error');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleBulkLiquidation = async () => {
    try {
      setLoading(true);
      await checkAndPrepareLiquidations();
      await fetchAllData();
      showMessage('Bulk liquidation completed!', 'success');
    } catch (error) {
      console.error('Error in bulk liquidation:', error);
      showMessage('Failed to perform bulk liquidation. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLoanRequest = async (tokenId: string) => {
    try {
      setLoading(true);
      await cancelLoanRequest(tokenId);
      await fetchAllData();
      showMessage('Loan request cancelled successfully!', 'success');
    } catch (error) {
      console.error('Error cancelling loan request:', error);
      showMessage('Failed to cancel loan request. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };
  
  const formatDaysRemaining = (durationInDays: number) => {
    return durationInDays === 1 ? `${durationInDays} day` : `${durationInDays} days`;
  };

  const formatLoanDuration = (deadline: number, isFunded: boolean) => {
    if (isFunded) {
      // If funded, deadline is a timestamp
      return `Deadline: ${formatTimestamp(deadline)}`;
    } else {
      // If not funded, deadline is duration in days
      return `${Math.round(deadline)} days`;
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const renderRequestLoanTab = () => {
    const selectedNFT = userNFTs.find(nft => nft.tokenId === selectedTokenId);
    
    return (
      <div className="loan-section">
        <h3 className="loan-section-title">Request a Loan</h3>
        
        {userNFTs.length === 0 ? (
          <div className="empty-state">
            <p>You don't have any Assets to use as collateral.</p>
          </div>
        ) : (
          <form onSubmit={handleRequestLoan} className="form-container">
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Select Asset as Collateral</label>
                <select
                  value={selectedTokenId}
                  onChange={(e) => setSelectedTokenId(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">Choose an Asset...</option>
                  {userNFTs.map((nft) => (
                    <option key={nft.tokenId} value={nft.tokenId}>
                      {nft.name} (ID: {nft.tokenId})
                    </option>
                  ))}
                </select>
                
                {/* Show selected NFT with proof */}
                {selectedNFT && selectedNFT.imageUrl && (
                  <div className="mt-4">
                    <NFTWithProof
                      name={selectedNFT.name}
                      imageUrl={selectedNFT.imageUrl}
                      proofOfOwnership={selectedNFT.proofOfOwnership || ''}
                      tokenId={selectedNFT.tokenId}
                      size="small"
                    />
                  </div>
                )}
              </div>
              
              <div className="form-field">
                <label className="form-label">Loan Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  className="form-input"
                  placeholder="e.g., 1500.00"
                  required
                />
                {ethPrice && loanAmount && (
                  <small className="text-gray-400">
                    ≈ {(parseFloat(loanAmount) / parseFloat(ethPrice)).toFixed(4)} ETH
                  </small>
                )}
              </div>
              
              <div className="form-field">
                <label className="form-label">Loan Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={loanDuration}
                  onChange={(e) => setLoanDuration(e.target.value)}
                  className="form-input"
                  placeholder="e.g., 30"
                  required
                />
              </div>
            </div>
            
            {ethPrice && (
              <div className="price-info">
                <p className="text-sm text-gray-300">
                  Current ETH Price: ${parseFloat(ethPrice).toFixed(2)} USD
                </p>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary mt-6 w-full"
            >
              {loading ? 'Requesting Loan...' : 'Request Loan'}
            </button>
          </form>
        )}
      </div>
    );
  };
  const renderBrowseLoansTab = () => (
    <div className="loan-section">
      <h3 className="loan-section-title">Available Loan Requests</h3>
      
      {allLoans.filter(loan => !loan.isFunded).length === 0 ? (
        <div className="text-white text-center py-8">
          <p>No unfunded loan requests available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allLoans.filter(loan => !loan.isFunded).map((loan) => (            <div key={loan.tokenId} className="loan-card">
              <div className="flex gap-4 mb-4">
                {loan.imageUrl && (
                  <NFTWithProof
                    name={loan.name || `NFT #${loan.tokenId}`}
                    imageUrl={loan.imageUrl}
                    proofOfOwnership={loan.proofOfOwnership || ''}
                    tokenId={loan.tokenId}
                    size="small"
                    className="loan-image-container"
                    showLabels={false}
                  />
                )}
                
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-2">
                    {loan.name || `Token ID: ${loan.tokenId}`}
                  </h3>                  <div className="space-y-2 text-gray-300">
                    <p>Borrower: {loan.borrower === account ? 'You' : truncateAddress(loan.borrower)}</p>
                    <p>Loan Amount: {parseFloat(loan.loanAmount).toFixed(3)} ETH</p>
                    {ethPrice && (
                      <p className="text-sm text-gray-400">
                        ≈ ${(parseFloat(loan.loanAmount) * parseFloat(ethPrice)).toFixed(2)} USD
                      </p>
                    )}
                    <p>Loan Duration: {formatLoanDuration(loan.deadline, loan.isFunded)}</p>
                  </div>
                </div>
              </div>

              <div className="loan-actions">
                {loan.borrower.toLowerCase() === account?.toLowerCase() ? (
                  <button
                    onClick={() => handleCancelLoanRequest(loan.tokenId)}
                    disabled={loading}
                    className="btn btn-danger flex-1"
                  >
                    {loading ? 'Cancelling...' : 'Cancel Request'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleFundLoan(loan.tokenId)}
                    disabled={loading}
                    className="btn btn-success flex-1"
                  >
                    {loading ? 'Funding...' : `Fund ${parseFloat(loan.loanAmount).toFixed(3)} ETH`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderManageLoansTab = () => (
    <div className="loan-section">
      <h3 className="loan-section-title">Manage Your Loans</h3>
      
      {/* Active Loans */}
      {userLoans.length === 0 ? (
        <div className="text-white text-center py-8">
          <p>You don't have any active loans.</p>
        </div>        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userLoans.map((loan) => {
              const isOverdue = Date.now() / 1000 > loan.deadline;
              const isBorrower = loan.borrower.toLowerCase() === account?.toLowerCase();
              const isLender = loan.lender.toLowerCase() === account?.toLowerCase();
              
              return (
                <div key={loan.tokenId} className="loan-card">
                  <div className="flex gap-4 mb-4">
                    {loan.imageUrl && (
                      <NFTWithProof
                        name={loan.name || `NFT #${loan.tokenId}`}
                        imageUrl={loan.imageUrl}
                        proofOfOwnership={loan.proofOfOwnership || ''}
                        tokenId={loan.tokenId}
                        size="small"
                        className="loan-image-container"
                      />
                    )}
                    
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-2">
                        {loan.name || `Token ID: ${loan.tokenId}`}
                      </h3>
                      
                      <div className="space-y-2 text-gray-300">
                        <p className={`font-semibold ${isBorrower ? 'text-yellow-400' : 'text-green-400'}`}>
                          Role: {isBorrower ? 'Borrower' : 'Lender'}
                        </p>
                        <p>Loan Amount: {parseFloat(loan.loanAmount).toFixed(3)} ETH</p>
                        {ethPrice && (
                          <p className="text-sm text-gray-400">
                            ≈ ${(parseFloat(loan.loanAmount) * parseFloat(ethPrice)).toFixed(2)} USD
                          </p>
                        )}
                        <p>Interest: {parseFloat(loan.interestAmount).toFixed(3)} ETH</p>
                        {ethPrice && (
                          <p className="text-sm text-gray-400">
                            ≈ ${(parseFloat(loan.interestAmount) * parseFloat(ethPrice)).toFixed(2)} USD
                          </p>
                        )}
                        {isBorrower ? (
                          <p>Lender: {truncateAddress(loan.lender)}</p>
                        ) : (
                          <p>Borrower: {truncateAddress(loan.borrower)}</p>
                        )}
                        <p>Start Date: {formatTimestamp(loan.startTime)}</p>
                        <p className={isOverdue ? 'text-red-400' : 'text-yellow-400'}>
                          Deadline: {formatTimestamp(loan.deadline)} {isOverdue && '(OVERDUE)'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {isBorrower && (
                      <button
                        onClick={() => handleRepayLoan(loan.tokenId)}
                        disabled={loading}
                        className="flex-1 btn btn-success repay-loan"
                      >
                        {loading ? 'Repaying...' : 'Repay Loan'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
      )}
    </div>
  );

  const renderLiquidationTab = () => {
    // Separate expired loans by lender vs borrower
    const expiredLoans = userLoans.filter(loan => Date.now() / 1000 > loan.deadline);
    const lenderExpiredLoans = expiredLoans.filter(loan => loan.lender.toLowerCase() === account?.toLowerCase());
    const borrowerExpiredLoans = expiredLoans.filter(loan => loan.borrower.toLowerCase() === account?.toLowerCase());
    
    return (
      <div className="loan-section">
        <h3 className="loan-section-title">Liquidation Center</h3>
        

        {/* Loans where user is the lender (priority) */}
        {lenderExpiredLoans.length > 0 && (
          <div className="loan-section">
            <h4 className="loan-section-title">Your Loans as Lender (Available for Liquidation)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lenderExpiredLoans.map((loan) => (
                <div key={loan.tokenId} className="bg-red-900/30 border border-red-600 rounded-lg p-4">
                  <div className="flex gap-4 mb-4">
                    {loan.imageUrl && (
                      <NFTWithProof
                        name={loan.name || `NFT #${loan.tokenId}`}
                        imageUrl={loan.imageUrl}
                        proofOfOwnership={loan.proofOfOwnership || ''}
                        tokenId={loan.tokenId}
                        size="small"
                        className="w-16 h-16"
                        showLabels={false}
                      />
                    )}
                    <div className="flex-1">
                      <h5 className="text-white font-semibold mb-2">
                        {loan.name || `Token ID: ${loan.tokenId}`}
                      </h5>
                      <div className="space-y-1 text-red-200 text-sm">
                        <p>Borrower: {truncateAddress(loan.borrower)}</p>
                        <p>Loan: {parseFloat(loan.loanAmount).toFixed(3)} ETH</p>
                        {ethPrice && (
                          <p className="text-xs text-gray-400">
                            ≈ ${(parseFloat(loan.loanAmount) * parseFloat(ethPrice)).toFixed(2)} USD
                          </p>
                        )}
                        <p>Interest: {parseFloat(loan.interestAmount).toFixed(3)} ETH</p>
                        {ethPrice && (
                          <p className="text-xs text-gray-400">
                            ≈ ${(parseFloat(loan.interestAmount) * parseFloat(ethPrice)).toFixed(2)} USD
                          </p>
                        )}
                        <p>Expired: {formatTimestamp(loan.deadline)}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLiquidateLoan(loan.tokenId)}
                    disabled={loading}
                    className="btn btn-danger w-full"
                  >
                    {loading ? 'Liquidating...' : 'Liquidate Loan'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other liquidatable loans */}
        {expiredLoans.filter(loan => loan.lender.toLowerCase() !== account?.toLowerCase()).length > 0 && (
          <div className="loan-section">
            <h4 className="loan-section-title">Other Liquidatable Loans</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {expiredLoans.filter(loan => loan.lender.toLowerCase() !== account?.toLowerCase()).map((loan) => (
                <div key={loan.tokenId} className="bg-red-900/30 border border-red-600 rounded-lg p-4">
                  <div className="flex gap-4 mb-4">
                    {loan.imageUrl && (
                      <NFTWithProof
                        name={loan.name || `NFT #${loan.tokenId}`}
                        imageUrl={loan.imageUrl}
                        proofOfOwnership={loan.proofOfOwnership || ''}
                        tokenId={loan.tokenId}
                        size="small"
                        className="w-16 h-16"
                        showLabels={false}
                      />
                    )}
                    <div className="flex-1">
                      <h5 className="text-white font-semibold mb-2">
                        {loan.name || `Token ID: ${loan.tokenId}`}
                      </h5>
                      <div className="space-y-1 text-red-200 text-sm">
                        <p>Borrower: {truncateAddress(loan.borrower)}</p>
                        <p>Lender: {truncateAddress(loan.lender)}</p>
                        <p>Loan: {parseFloat(loan.loanAmount).toFixed(3)} ETH</p>
                        {ethPrice && (
                          <p className="text-xs text-gray-400">
                            ≈ ${(parseFloat(loan.loanAmount) * parseFloat(ethPrice)).toFixed(2)} USD
                          </p>
                        )}
                        <p>Interest: {parseFloat(loan.interestAmount).toFixed(3)} ETH</p>
                        {ethPrice && (
                          <p className="text-xs text-gray-400">
                            ≈ ${(parseFloat(loan.interestAmount) * parseFloat(ethPrice)).toFixed(2)} USD
                          </p>
                        )}
                        <p>Expired: {formatTimestamp(loan.deadline)}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLiquidateLoan(loan.tokenId)}
                    disabled={loading}
                    className="btn btn-danger w-full"
                  >
                    {loading ? 'Liquidating...' : 'Liquidate Loan'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show message if no liquidatable loans */}
        {expiredLoans.length === 0 && (
          <div className="text-white text-center py-8">
            <p>No loans currently available for liquidation.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="loan-container">
      <BackButton />
      <div className="background-overlay"></div>
      <div className="star-field">
        {[...Array(10)].map((_, index) => (
          <div key={index} className="star"></div>
        ))}
      </div>
      <h2 className="page-title">Asset Loans</h2>

      {/* Message Display */}
      {message && (
        <div className={`message-display ${message.type}`}>
          {message.text}
        </div>
      )}

      {!isConnected ? (
        <div className="wallet-prompt">
          <p>Please connect your wallet to access loan features.</p>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              onClick={() => setActiveTab('request')}
              className={`tab-button ${activeTab === 'request' ? 'tab-button--active' : ''}`}
            >
              Request Loan
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`tab-button ${activeTab === 'browse' ? 'tab-button--active' : ''}`}
            >
              Browse Requests ({allLoans.filter(loan => !loan.isFunded).length})
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`tab-button ${activeTab === 'manage' ? 'tab-button--active' : ''}`}
            >
              Manage Loans ({userLoans.length})
            </button>
            <button
              onClick={() => setActiveTab('liquidation')}
              className={`tab-button ${activeTab === 'liquidation' ? 'tab-button--active' : ''}`}
            >
              Liquidation ({userLoans.filter(loan => Date.now() / 1000 > loan.deadline).length})
            </button>
          </div>

          {/* Refresh Button */}
          <div className="refresh-section">
            <button
              onClick={fetchAllData}
              disabled={fetchingData}
              className="btn btn-secondary"
            >
              {fetchingData ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>

          {/* Tab Content */}
          {fetchingData ? (
            <div className="loading-state">
              <p>Loading loan data...</p>
            </div>
          ) : (
            <div className="tab-content">
              {activeTab === 'request' && renderRequestLoanTab()}
              {activeTab === 'browse' && renderBrowseLoansTab()}
              {activeTab === 'manage' && renderManageLoansTab()}
              {activeTab === 'liquidation' && renderLiquidationTab()}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LoanView;