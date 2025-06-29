// types/index.ts or wherever your interfaces are defined

export type UploadedImage = {
  file: File;
  preview: string;
  ipfsUrl?: string;
};

export type NFTData = {
  tokenId: string;
  name: string;
  description: string;
  imageUrl: string;
  owner: string;
};

export type NFTSale = {
  tokenId: string;
  seller: string;
  buyer: string;
  price: string;
  isActive: boolean;
};
