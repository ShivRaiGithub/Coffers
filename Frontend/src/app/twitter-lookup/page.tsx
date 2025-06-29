'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import BackButton from '../components/BackButton';
import './lookup.css';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SearchResult {
  wallet_address?: string;
  twitter_handle?: string;
  wallets?: string[];
}

const TwitterLookupPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchType, setSearchType] = useState<'auto' | 'wallet' | 'twitter'>('auto');

  const detectSearchType = (query: string): 'wallet' | 'twitter' => {
    // Check if it's a wallet address (starts with 0x and is 42 characters long)
    if (query.startsWith('0x') && query.length === 42) {
      return 'wallet';
    }
    // Check if it looks like a Twitter handle (starts with @ or is alphanumeric)
    return 'twitter';
  };

  const searchByWallet = async (walletAddress: string) => {
    const { data, error } = await supabase
      .from('user_wallets')
      .select('twitter_handle')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error('Database error occurred');
    }

    return data;
  };

  const searchByTwitter = async (twitterHandle: string) => {
    // Remove @ if present
    const cleanHandle = twitterHandle.replace('@', '');
    
    const { data, error } = await supabase
      .from('user_wallets')
      .select('wallet_address')
      .eq('twitter_handle', cleanHandle);

    if (error) {
      throw new Error('Database error occurred');
    }

    return data;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a wallet address or Twitter handle');
      return;
    }

    setLoading(true);
    setError('');
    setSearchResults(null);

    try {
      const query = searchQuery.trim();
      const type = searchType === 'auto' ? detectSearchType(query) : searchType;

      if (type === 'wallet') {
        // Search by wallet address
        if (!query.startsWith('0x') || query.length !== 42) {
          throw new Error('Invalid wallet address format. Must start with 0x and be 42 characters long.');
        }

        const result = await searchByWallet(query);
        
        if (result && result.twitter_handle) {
          setSearchResults({
            wallet_address: query,
            twitter_handle: result.twitter_handle
          });
        } else {
          setSearchResults(null);
          setError('No Twitter handle found for this wallet address');
        }
      } else {
        // Search by Twitter handle
        const cleanHandle = query.replace('@', '');
        
        if (!/^[a-zA-Z0-9_]+$/.test(cleanHandle)) {
          throw new Error('Invalid Twitter handle format. Only letters, numbers, and underscores allowed.');
        }

        const results = await searchByTwitter(cleanHandle);
        
        if (results && results.length > 0) {
          setSearchResults({
            twitter_handle: cleanHandle,
            wallets: results.map(r => r.wallet_address)
          });
        } else {
          setSearchResults(null);
          setError('No wallet addresses found for this Twitter handle');
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during search');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="lookup-container">
      <div className="background-overlay"></div>
      
      <BackButton />
      
      <div className="lookup-content">
        {/* Header */}
        <div className="lookup-header">
          <h1 className="lookup-title">
            <span className="title-icon">🔍</span>
            Twitter <span className="title-highlight">Lookup</span>
          </h1>
          <p className="lookup-description">
            Find Twitter handles linked to wallet addresses or discover wallet addresses associated with a Twitter handle.
          </p>
        </div>

        {/* Search Section */}
        <div className="search-section">
          <div className="search-container">
            <div className="search-type-selector">
              <button
                className={`search-type-btn ${searchType === 'auto' ? 'active' : ''}`}
                onClick={() => setSearchType('auto')}
              >
                🤖 Auto Detect
              </button>
              <button
                className={`search-type-btn ${searchType === 'wallet' ? 'active' : ''}`}
                onClick={() => setSearchType('wallet')}
              >
                👛 Wallet Address
              </button>
              <button
                className={`search-type-btn ${searchType === 'twitter' ? 'active' : ''}`}
                onClick={() => setSearchType('twitter')}
              >
                🐦 Twitter Handle
              </button>
            </div>

            <div className="search-input-container">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  searchType === 'wallet' 
                    ? "Enter wallet address (0x...)" 
                    : searchType === 'twitter'
                    ? "Enter Twitter handle (@username or username)"
                    : "Enter wallet address or Twitter handle"
                }
                className="search-input"
                disabled={loading}
              />
              <button
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                className="search-button"
              >
                {loading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  <span>🔍</span>
                )}
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Search Results */}
        {searchResults && (
          <div className="results-section">
            <h3 className="results-title">Search Results</h3>
            
            {searchResults.twitter_handle && searchResults.wallet_address && (
              <div className="result-card">
                <div className="result-header">
                  <span className="result-type">Wallet → Twitter</span>
                </div>
                <div className="result-content">
                  <div className="result-item">
                    <span className="result-label">Wallet Address:</span>
                    <div className="result-value-container">
                      <span className="result-value wallet-address-full">
                        {searchResults.wallet_address}
                      </span>
                      <button
                        onClick={() => copyToClipboard(searchResults.wallet_address!)}
                        className="copy-btn"
                        title="Copy address"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Twitter Handle:</span>
                    <div className="result-value-container">
                      <span className="result-value twitter-handle-result">
                        @{searchResults.twitter_handle}
                      </span>
                      <a
                        href={`https://twitter.com/${searchResults.twitter_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="twitter-link"
                        title="Visit Twitter profile"
                      >
                        🔗
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {searchResults.twitter_handle && searchResults.wallets && (
              <div className="result-card">
                <div className="result-header">
                  <span className="result-type">Twitter → Wallets</span>
                  <span className="result-count">{searchResults.wallets.length} wallet(s) found</span>
                </div>
                <div className="result-content">
                  <div className="result-item">
                    <span className="result-label">Twitter Handle:</span>
                    <div className="result-value-container">
                      <span className="result-value twitter-handle-result">
                        @{searchResults.twitter_handle}
                      </span>
                      <a
                        href={`https://twitter.com/${searchResults.twitter_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="twitter-link"
                        title="Visit Twitter profile"
                      >
                        🔗
                      </a>
                    </div>
                  </div>
                  <div className="wallets-list">
                    <span className="result-label">Associated Wallets:</span>
                    {searchResults.wallets.map((wallet, index) => (
                      <div key={index} className="wallet-item">
                        <span className="wallet-address wallet-address-full">
                          {wallet}
                        </span>
                        <button
                          onClick={() => copyToClipboard(wallet)}
                          className="copy-btn"
                          title="Copy address"
                        >
                          📋
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="help-section">
          <h3 className="help-title">How to Use</h3>
          <div className="help-content">
            <div className="help-item">
              <span className="help-icon">👛</span>
              <div className="help-text">
                <strong>Search by Wallet:</strong> Enter a wallet address (0x...) to find the associated Twitter handle
              </div>
            </div>
            <div className="help-item">
              <span className="help-icon">🐦</span>
              <div className="help-text">
                <strong>Search by Twitter:</strong> Enter a Twitter handle (@username) to find all associated wallet addresses
              </div>
            </div>
            <div className="help-item">
              <span className="help-icon">🤖</span>
              <div className="help-text">
                <strong>Auto Detect:</strong> Let the system automatically determine if you're searching by wallet or Twitter handle
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwitterLookupPage;
