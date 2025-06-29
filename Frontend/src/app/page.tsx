'use client';
import React, { useState, useEffect } from 'react';
import { useWallet } from './WalletContext';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import './styles.css';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const router = useRouter();

  const {
    account,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    chainId,
  } = useWallet();

  const [error, setError] = useState<null | string>(null);
  const [copied, setCopied] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [twitterHandle, setTwitterHandle] = useState<null | string>(null);
  const [isConnectingTwitter, setIsConnectingTwitter] = useState(false);

  const handleConnectWallet = async () => {
    try {
      setError(null);
      await connectWallet();
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
    }
  };

  const copyAddress = async () => {
    if (account) {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };


  
const handleConnectTwitter = async () => {
  if (!account) {
    setError('Please connect wallet first');
    return;
  }

  setIsConnectingTwitter(true);
  setError(null);

  // Store wallet address before redirect
  localStorage.setItem('pending_wallet', account);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'twitter',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    setError('Failed to connect Twitter');
    setIsConnectingTwitter(false);
  }
};

  // Check for existing Twitter connection when wallet connects
useEffect(() => {
  if (account) {
    supabase
      .from('user_wallets')
      .select('twitter_handle')
      .eq('wallet_address', account.toLowerCase())
      .single()
      .then(({ data }) => {
        if (data?.twitter_handle) {
          setTwitterHandle(data.twitter_handle);
        }
      });
  }
}, [account]);

  // Handle OAuth callback
  useEffect(() => {
  const handleTwitterCallback = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Get stored wallet address from before redirect
      const storedWallet = localStorage.getItem('pending_wallet');
      
      if (storedWallet) {
        // Get Twitter username
        const twitterUsername = session.user.user_metadata?.user_name || 
                               session.user.user_metadata?.preferred_username;
        
        if (twitterUsername) {
          // Save to database
          await supabase
            .from('user_wallets')
            .upsert({
              wallet_address: storedWallet.toLowerCase(),
              twitter_handle: twitterUsername
            });

          setTwitterHandle(twitterUsername);
        }
        
        // Clean up
        localStorage.removeItem('pending_wallet');
        await supabase.auth.signOut();
      }
      
      setIsConnectingTwitter(false);
    }
  };

  handleTwitterCallback();
}, []);

const menuItems = [
  { path: '/view', title: 'My Assets', description: 'View all the NFTs you own or have created', icon: '📦', iconClass: 'green-gradient' },
  { path: '/create', title: 'Create Assets', description: 'Mint your real-world assets into tradeable NFTs', icon: '🎨', iconClass: 'green-gradient' },
  { path: '/sell', title: 'Sell Assets', description: 'List your tokenized assets on the marketplace', icon: '💰', iconClass: 'green-gradient' },
  { path: '/buy', title: 'Buy Assets', description: 'Discover and purchase verified tokenized assets', icon: '🛒', iconClass: 'orange-gradient' },
  { path: '/loan', title: 'DeFi Loans', description: 'Use Assets as collateral for instant loans', icon: '🏦', iconClass: 'orange-gradient' },
  { path: '/twitter-lookup', title: 'Twitter Lookup', description: 'Find Twitter handles linked to wallets or view wallets linked to a Twitter', icon: '🔍', iconClass: 'orange-gradient' },
];


  const features = [
    { title: "Tokenize Your Assets", description: "Transform real-world assets into blockchain-verified NFTs with proof of ownership", icon: "🛡️", gradientClass: "gradient-1" },
    { title: "Trade Assets", description: "Buy and sell tokenized assets in a secure, decentralized marketplace", icon: "📈", gradientClass: "gradient-2" },
    { title: "Collateralized Loans", description: "Unlock liquidity by using your NFTs as collateral for instant DeFi loans", icon: "🪙", gradientClass: "gradient-3" },
    { title: "Community Driven", description: "Join a growing ecosystem of asset owners, traders, and DeFi participants", icon: "👥", gradientClass: "gradient-4" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [features.length]);

  return (
    <div className="app-container">
      {/* Animated background */}
      <div className="animated-background">
        <div className="bg-element-1"></div>
        <div className="bg-element-2"></div>
      </div>

      <div className="main-content">
        {/* Header */}
        <header className="header">
          <div className="nav-container">
            <div className="logo-container">
              <div className="logo-icon"><span>🪙</span></div>
              <h1 className="logo-text">Coffers</h1>
            </div>

            {isConnected ? (
              <div className="wallet-connected">
                <div className="wallet-info">
                  <div className="wallet-details">
                    <div className="status-indicator"></div>
                    <div className="wallet-text">
                      <p className="wallet-address">{account?.slice(0, 6)}...{account?.slice(-4)}</p>
                      <p className="wallet-chain">Chain ID: {chainId}</p>
                      {twitterHandle && (
                        <p className="twitter-handle">@{twitterHandle}</p>
                      )}
                    </div>
                    <button onClick={copyAddress} className="copy-button" title="Copy address">
                      {copied ? <span className="copy-success">✓</span> : <span className="copy-text">📋</span>}
                    </button>
                    {!twitterHandle && (
                      <button 
                        onClick={handleConnectTwitter} 
                        disabled={isConnectingTwitter}
                        className="twitter-button" 
                        title="Connect Twitter"
                      >
                        <span className="twitter-icon">Connect Twitter</span>
                        {isConnectingTwitter ? '...' : ''}
                      </button>
                    )}
                    <button onClick={disconnectWallet} className="disconnect-button" title="Disconnect wallet">
                      <span className="disconnect-text">✕</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={handleConnectWallet} disabled={isConnecting} className="connect-wallet-button">
                <span>👛</span> {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="error-container">
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                <p>{error}</p>
              </div>
            </div>
          )}
        </header>

        {/* Content Section Based on Wallet Status */}
        {!isConnected ? (
          <>
            {/* Hero */}
            <div className="hero-section">
              <h1 className="hero-title">
                Unlock the Power of <span className="hero-highlight"> Tokenized RWAs</span>
              </h1>
              <p className="hero-description">
                Transform your real-world assets into tradeable NFTs. Access DeFi loans, trade on decentralized markets, and participate in the future of asset tokenization.
              </p>
            </div>

            {/* Why Choose Coffers */}
            <section className="features-section">
              <div className="features-container">
                <div className="features-header">
                  <h2 className="features-title">Why Choose Coffers?</h2>
                  <div className="carousel-dots">
                    {features.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`carousel-dot ${index === currentSlide ? 'active' : ''}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="carousel-container">
                  <div className="carousel-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                    {features.map((feature, index) => (
                      <div key={index} className="feature-slide">
                        <div className={`feature-icon ${feature.gradientClass}`}>
                          <span>{feature.icon}</span>
                        </div>
                        <h3 className="feature-title">{feature.title}</h3>
                        <p className="feature-description">{feature.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Welcome Heading Styled Like Hero */}
            <div className="hero-section">
              <h1 className="hero-title">
                Welcome to <span className="hero-highlight">Coffers</span>
              </h1>
              <p className="hero-description">
                Choose an action below to start uploading, minting, selling, or buying real-world tokenized assets.
              </p>
            </div>

            {/* Action Menu */}
            <section className="menu-section">
              <div className="menu-container">
                <h3 className="menu-title">Choose Your Action</h3>
                <div className="menu-grid">
                  {menuItems.map(({ path, title, description, icon, iconClass }) => (
                    <button
                      key={path}
                      onClick={() => router.push(path)}
                      className="menu-item"
                    >
                      <div className={`menu-item-icon ${iconClass}`}>
                        <span>{icon}</span>
                      </div>
                      <h4 className="menu-item-title">{title}</h4>
                      <p className="menu-item-description">{description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* Footer */}
        <footer className="footer">
          <div className="footer-content">
            <p className="footer-text">© 2025 Coffers. Empowering the future of asset tokenization.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}