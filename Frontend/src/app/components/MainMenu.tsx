'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../WalletContext';

export default function MainMenu() {
  const router = useRouter();
  const {
    account,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    chainId,
  } = useWallet();

  const [error, setError] = useState<string | null>(null);

  const handleConnectWallet = async () => {
    try {
      setError(null);
      await connectWallet();
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    }
  };

  // Define the menu items and respective paths/icons
  const menuItems = [
    {
      path: '/upload',
      title: 'Upload Images',
      description: 'Upload images to IPFS for NFT creation',
      icon: '📁',
    },
    {
      path: '/create',
      title: 'Create NFT',
      description: 'Mint NFTs using uploaded images',
      icon: '🎨',
    },
    {
      path: '/sell',
      title: 'Sell NFT',
      description: 'List your NFTs for sale',
      icon: '💰',
    },
    {
      path: '/buy',
      title: 'Buy NFT',
      description: 'Purchase NFTs available to you',
      icon: '🛍️',
    },
    {
      path: '/loan',
      title: 'Loan',
      description: 'Loan and loan details',
      icon: '🏦',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-white">NFT Marketplace</h1>
          {isConnected ? (
            <div className="flex items-center gap-4 text-white text-sm">
              <div>
                <p>
                  Connected: {account?.slice(0, 6)}...{account?.slice(-4)}
                </p>
                <p>Chain ID: {chainId}</p>
              </div>
              <button
                onClick={disconnectWallet}
                className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </header>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Menu Display */}
        {isConnected ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Choose an Action</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {menuItems.map(({ path, title, description, icon }) => (
                <button
                  key={path}
                  onClick={() => router.push(path)} // Redirection logic
                  className="p-6 bg-white/20 rounded-xl hover:bg-white/30 transform hover:scale-105 transition-all"
                >
                  <div className="text-4xl mb-4">{icon}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
                  <p className="text-gray-300">{description}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-white">
            <h2 className="text-2xl mb-4">Welcome to NFT Marketplace</h2>
            <p className="text-gray-300 mb-8">Connect your wallet to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
