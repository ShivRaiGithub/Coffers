'use client';

import React, { useState } from 'react';
import BackButton from '../components/BackButton';
import NFTWithProof from '../components/NFTWithProof';
import { useWallet } from '../WalletContext';
import './create.css';

type UploadedImage = {
  file: File;
  preview: string;
  ipfsUrl: string;
};

const CreateNFTView: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [objectImage, setObjectImage] = useState<File | null>(null);
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [uploadedObject, setUploadedObject] = useState<UploadedImage | null>(null);
  const [uploadedProof, setUploadedProof] = useState<UploadedImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [status, setStatus] = useState('');
  const [createdNFTs, setCreatedNFTs] = useState<Array<{
    name: string;
    description: string;
    image: string;
    proof_of_ownership: string;
    timestamp: Date;
  }>>([]);

  const { account, mintNFT } = useWallet();

  const uploadToIPFS = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': process.env.NEXT_PUBLIC_PINATA_API_KEY!,
          'pinata_secret_api_key': process.env.NEXT_PUBLIC_PINATA_SECRET_KEY!,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload to IPFS: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw error;
    }
  };

  const uploadMetadataToIPFS = async (metadata: object): Promise<string> => {
    try {
      // Check if API keys are available
      const apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
      const secretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;
      
      if (!apiKey || !secretKey) {
        throw new Error('Pinata API keys not configured. Please set NEXT_PUBLIC_PINATA_API_KEY and NEXT_PUBLIC_PINATA_SECRET_KEY in your environment.');
      }

      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': apiKey,
          'pinata_secret_api_key': secretKey,
        },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: {
            name: `${(metadata as any).name}-metadata.json`,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Pinata API error:', errorText);
        throw new Error(`Failed to upload metadata: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
    } catch (error) {
      console.error('Metadata upload error:', error);
      throw error;
    }
  };

  // Handlers for selecting files
  const handleObjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatus('');
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setObjectImage(file);
      setUploadedObject(null); // reset uploaded data if selecting new file
    }
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatus('');
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setProofImage(file);
      setUploadedProof(null); // reset uploaded data if selecting new file
    }
  };

  // Upload both files when triggered
  const handleUploadImages = async () => {
    if (!objectImage || !proofImage) {
      setStatus('Please select both the Object Image and the Proof of Ownership image before uploading.');
      return;
    }

    setUploading(true);
    setStatus('Uploading images to IPFS...');

    try {
      const [objectIpfsUrl, proofIpfsUrl] = await Promise.all([
        uploadToIPFS(objectImage),
        uploadToIPFS(proofImage),
      ]);

      setUploadedObject({
        file: objectImage,
        preview: URL.createObjectURL(objectImage),
        ipfsUrl: objectIpfsUrl,
      });

      setUploadedProof({
        file: proofImage,
        preview: URL.createObjectURL(proofImage),
        ipfsUrl: proofIpfsUrl,
      });

      setStatus('✅ Images uploaded successfully to IPFS!');
    } catch (err) {
      console.error('Upload error:', err);
      setStatus('❌ Failed to upload images to IPFS.');
    } finally {
      setUploading(false);
    }
  };

  const validateInputs = () => {
    if (!account) {
      setStatus('Please connect your wallet first');
      return false;
    }
    
    if (!name.trim()) {
      setStatus('Please enter an NFT name');
      return false;
    }
    
    if (!description.trim()) {
      setStatus('Please enter a description');
      return false;
    }
    
    if (!uploadedObject || !uploadedProof) {
      setStatus('Please upload both the object image and proof of ownership image first');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateInputs()) {
      return;
    }

    const metadata = {
      name: name.trim(),
      description: description.trim(),
      image: uploadedObject!.ipfsUrl,
      proof_of_ownership: uploadedProof!.ipfsUrl,
      attributes: [
        {
          trait_type: "Type",
          value: "Proof of Ownership"
        }
      ]
    };

    try {
      setMinting(true);
      setStatus('Uploading metadata to IPFS...');

      const metadataUri = await uploadMetadataToIPFS(metadata);
      console.log('Metadata uploaded to:', metadataUri);

      setStatus('Minting NFT on blockchain...');
      await mintNFT(metadataUri);

      setStatus(`✅ NFT successfully minted!`);
      
      // Store the created NFT locally
      const newNFT = {
        ...metadata,
        timestamp: new Date()
      };
      setCreatedNFTs((prev: typeof createdNFTs) => [newNFT, ...prev]);

      // Reset form after successful minting
      setTimeout(() => {
        setName('');
        setDescription('');
        setObjectImage(null);
        setProofImage(null);
        setUploadedObject(null);
        setUploadedProof(null);
        setStatus('');
      }, 3000);

    } catch (err: any) {
      console.error('Minting error:', err);
      setStatus(`❌ Error: ${err.message || 'Failed to mint NFT'}`);
    } finally {
      setMinting(false);
    }
  };

  const getStatusMessageClass = (status: string) => {
    if (status.includes('✅')) return 'status-message status-message--success';
    if (status.includes('❌')) return 'status-message status-message--error';
    if (status.includes('Uploading') || status.includes('Minting')) return 'status-message status-message--loading';
    return 'status-message status-message--info';
  };

  return (
    <div className="marketplace-container">
      <div className="background-overlay"></div>
      <div className="star-field">
        {[...Array(20)].map((_, index) => (
          <div key={index} className="star"></div>
        ))}
      </div>
      
      <div className="create-nft-layout">
        <nav className="page-navigation">
          <BackButton />
        </nav>
        
        <main className="form-grid">
          {/* Create NFT Form */}
          <section className="form-container">
            <header className="form-section-header">
              <h1 className="page-title">Tokenize your asset into an NFT</h1>
            </header>

            <form onSubmit={handleSubmit} className="form-section">
              <div className="form-field">
                <label htmlFor="nft-name" className="form-label form-label--required">
                  Asset Name
                </label>
                <input
                  id="nft-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  maxLength={100}
                  className="form-input"
                  placeholder="Enter Asset name (e.g., 'My Artwork #1')"
                  aria-describedby="name-help"
                />
              </div>

              <div className="form-field">
                <label htmlFor="nft-description" className="form-label form-label--required">
                  Description
                </label>
                <textarea
                  id="nft-description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                  rows={4}
                  maxLength={500}
                  className="form-input form-textarea"
                  placeholder="Describe your Asset and what it represents..."
                  aria-describedby="description-help"
                />
                <div className="character-counter">
                  {description.length}/500 characters
                </div>
              </div>

              {/* File Upload Section */}
              <div className="form-field">
                <label htmlFor="object-image" className="form-label form-label--required">
                  Object Image
                </label>
                <input
                  id="object-image"
                  type="file"
                  accept="image/*"
                  onChange={handleObjectFileChange}
                  disabled={uploading || minting}
                  className="form-input file-input"
                  required
                />
                {objectImage && (
                  <p className="file-info">Selected: {objectImage.name}</p>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="proof-image" className="form-label form-label--required">
                  Proof of Ownership Image
                </label>
                <input
                  id="proof-image"
                  type="file"
                  accept="image/*"
                  onChange={handleProofFileChange}
                  disabled={uploading || minting}
                  className="form-input file-input"
                  required
                />
                {proofImage && (
                  <p className="file-info">Selected: {proofImage.name}</p>
                )}
              </div>

              {/* Upload Images Button */}
              {(objectImage && proofImage && !uploadedObject && !uploadedProof) && (
                <button
                  type="button"
                  onClick={handleUploadImages}
                  disabled={uploading || minting}
                  className="btn-upload"
                >
                  {uploading ? 'Uploading to IPFS...' : 'Upload Images to IPFS'}
                </button>
              )}

              {/* Preview section */}
              {(uploadedObject || uploadedProof) && (
                <section className="preview-container" aria-label="Image Preview">
                  <h3 className="preview-title">Uploaded Images</h3>
                  <div className="preview-grid">
                    {uploadedObject && (
                      <div className="preview-item">
                        <p className="preview-label">Object Image:</p>
                        <img
                          src={uploadedObject.preview}
                          alt="Object image preview"
                          className="preview-image"
                        />
                        <p className="preview-url">✅ Uploaded to IPFS</p>
                      </div>
                    )}
                    {uploadedProof && (
                      <div className="preview-item">
                        <p className="preview-label">Proof Image:</p>
                        <img
                          src={uploadedProof.preview}
                          alt="Proof image preview"
                          className="preview-image"
                        />
                        <p className="preview-url">✅ Uploaded to IPFS</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              <button
                type="submit"
                disabled={minting || !account || !uploadedObject || !uploadedProof}
                className="btn-create"
                aria-describedby="create-button-help"
              >
                {minting ? 'Minting NFT...' : !account ? 'Connect Wallet First' : !uploadedObject || !uploadedProof ? 'Upload Images First' : 'Create NFT'}
              </button>

              {status && (
                <div className={getStatusMessageClass(status)} role="status" aria-live="polite">
                  <p>{status}</p>
                </div>
              )}
            </form>
          </section>

          {/* Right Column - Recent NFT */}
          <aside className="form-container">
            {/* Most Recently Created NFT */}
            <section className="recent-nft-container">
              <h3 className="section-subtitle">Most Recent NFT</h3>

              {createdNFTs.length === 0 ? (
                <div className="recent-nft-empty">
                  <p className="secondary-text">No NFT minted yet. Create one to see it here!</p>
                </div>
              ) : (
                <article className="recent-nft-card">
                  <div className="recent-nft-content">
                    <NFTWithProof
                      name={createdNFTs[0].name}
                      imageUrl={createdNFTs[0].image}
                      proofOfOwnership={createdNFTs[0].proof_of_ownership}
                      size="small"
                      className="recent-nft-image-container"
                    />
                    <div className="recent-nft-details">
                      <h4 className="recent-nft-name">{createdNFTs[0].name}</h4>
                      <p className="recent-nft-description">{createdNFTs[0].description}</p>
                    </div>
                  </div>
                </article>
              )}
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default CreateNFTView;