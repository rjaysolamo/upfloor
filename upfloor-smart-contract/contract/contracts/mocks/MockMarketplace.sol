// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MockERC721} from "./MockERC721.sol";

contract MockMarketplace {
    mapping(uint256 => uint256) public nftPrices;
    mapping(uint256 => bool) public nftForSale;
    mapping(uint256 => address) public nftOwners;
    
    MockERC721 public nft;
    
    constructor(address _nft) {
        nft = MockERC721(_nft);
    }
    
    function setNFTSale(uint256 tokenId, uint256 price) external {
        nftPrices[tokenId] = price;
        nftForSale[tokenId] = true;
        nftOwners[tokenId] = address(this);
    }
    
    function buyNFT(uint256 tokenId) external payable {
        require(nftForSale[tokenId], "NFT not for sale");
        require(msg.value >= nftPrices[tokenId], "Insufficient payment");
        
        // Transfer NFT to buyer
        nft.safeTransferFrom(address(this), msg.sender, tokenId);
        nftForSale[tokenId] = false;
    }
    
    function isNFTAvailable(uint256 tokenId) external view returns (bool available, uint256 price) {
        return (nftForSale[tokenId], nftPrices[tokenId]);
    }
}
