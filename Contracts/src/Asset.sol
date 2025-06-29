// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Asset is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    address public mainContract;
    address public lendingContract;
    
    // Tracking variables
    mapping(address => uint256[]) private _ownedTokens;
    mapping(uint256 => uint256) private _ownedTokenIndex;
    uint256[] private _allTokens;

    modifier onlyMainContract() {
        require(msg.sender == mainContract, "Only main contract can call this");
        _;
    }

    modifier onlyAllowedContract() {
        require(msg.sender == lendingContract || msg.sender == mainContract, "Only lending or main contract can call this");
        _;
    }

    constructor() 
        ERC721("Asset", "AST")
        Ownable(msg.sender)
    {
    }
    function setMainContract(address _mainContract) external onlyOwner{
        require(mainContract == address(0), "Main contract already set");
        mainContract = _mainContract;
    }

    function setLendingContract(address _lendingContract) onlyOwner external {
        require(lendingContract == address(0), "Lending contract already set");
        lendingContract = _lendingContract;
    }

    function mint(address to, string memory uri) onlyMainContract external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        
        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        return tokenId;
    }

    // Allow main contract to facilitate transfers
    function facilitateTransfer(address from, address to, uint256 tokenId) external onlyAllowedContract {
        _safeTransfer(from, to, tokenId, "");
    }

    // Override _update to handle enumeration
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        if (from != address(0)) {
            _removeTokenFromOwnerEnumeration(from, tokenId);
        } else {
            // New token being minted
            _allTokens.push(tokenId);
        }

        address result = super._update(to, tokenId, auth);

        if (to != address(0)) {
            _addTokenToOwnerEnumeration(to, tokenId);
        }

        return result;
    }

    function _addTokenToOwnerEnumeration(address to, uint256 tokenId) internal {
        _ownedTokenIndex[tokenId] = _ownedTokens[to].length;
        _ownedTokens[to].push(tokenId);
    }

    function _removeTokenFromOwnerEnumeration(address from, uint256 tokenId) internal {
        uint256 lastTokenIndex = _ownedTokens[from].length - 1;
        uint256 tokenIndex = _ownedTokenIndex[tokenId];

        if (tokenIndex != lastTokenIndex) {
            uint256 lastTokenId = _ownedTokens[from][lastTokenIndex];
            _ownedTokens[from][tokenIndex] = lastTokenId;
            _ownedTokenIndex[lastTokenId] = tokenIndex;
        }

        _ownedTokens[from].pop();
        delete _ownedTokenIndex[tokenId];
    }

    // ========== VIEW FUNCTIONS ==========

    function getAllTokens() external view returns (uint256[] memory) {
        return _allTokens;
    }

    function getTokensOfOwner(address owner) external view returns (uint256[] memory) {
        return _ownedTokens[owner];
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    function exists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    // Required overrides
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}