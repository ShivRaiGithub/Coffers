'use client';

import React from 'react';
import './NFTWithProof.css';

interface NFTWithProofProps {
  name: string;
  imageUrl: string;
  proofOfOwnership: string;
  tokenId?: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
}

const NFTWithProof: React.FC<NFTWithProofProps> = ({
  name,
  imageUrl,
  proofOfOwnership,
  tokenId,
  className = '',
  size = 'medium',
  showLabels = true
}) => {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjMyIiB5PSIzMiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tk8gSU1BR0U8L3RleHQ+Cjwvc3ZnPg==';
  };

  const handleImageClick = (imageUrl: string) => {
    window.open(imageUrl, '_blank');
  };

  return (
    <div className={`nft-with-proof nft-with-proof--${size} ${className}`}>
      {/* NFT Header */}
      <div className="nft-with-proof__header">
        <h3 className="nft-with-proof__title">{name}</h3>
        {tokenId && (
          <span className="nft-with-proof__token-id">#{tokenId}</span>
        )}
      </div>

      {/* Images Container */}
      <div className="nft-with-proof__images">
        {/* Main NFT Image */}
        <div className="nft-with-proof__image-container">
          {showLabels && (
            <span className="nft-with-proof__image-label">Asset</span>
          )}
          <img
            src={imageUrl}
            alt={`${name} NFT`}
            className="nft-with-proof__image nft-with-proof__image--main nft-with-proof__image--clickable"
            onClick={() => handleImageClick(imageUrl)}
            onError={handleImageError}
          />
        </div>

        {/* Proof of Ownership Image */}
        <div className="nft-with-proof__image-container">
          {showLabels && (
            <span className="nft-with-proof__image-label">Proof</span>
          )}
          <img
            src={proofOfOwnership}
            alt={`${name} Proof of Ownership`}
            className="nft-with-proof__image nft-with-proof__image--proof nft-with-proof__image--clickable"
            onClick={() => handleImageClick(proofOfOwnership)}
            onError={handleImageError}
          />
          {/* Proof Badge */}
          <div className="nft-with-proof__proof-badge">
            <svg viewBox="0 0 24 24" className="nft-with-proof__proof-icon">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFTWithProof;
