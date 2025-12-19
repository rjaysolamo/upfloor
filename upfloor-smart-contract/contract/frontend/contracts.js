/**
 * Contract ABIs and Addresses for Frontend
 */

// Contract Addresses (ApeChain)
export const CONTRACT_ADDRESSES = {
    TOKEN: "0xc41670C04E162D3207Be18eef60C6341953B9B32",
    STRATEGY: "0x6006e62c5557c6c79a9dDdEAadc6e361567d8CDa",
    ROUTER: "0x48BcB87056f38008ae1924a0d1a993D0954f65c9",
    NFT_COLLECTION: "0x2132e53a520da3783135016c2d1c03cbb4576433",
    FACTORY: "0xE8E1CcA455F59b1C9351d503B4a81E9D38324884"
};

// UpFloorToken ABI (Essential functions)
export const TOKEN_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address owner) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    "function previewMint(uint256 amount) view returns (uint256)",
    "function previewRedeem(uint256 amount) view returns (uint256)",
    "function mint(uint256 amount, address receiver) payable",
    "function redeem(uint256 amount, address receiver)",
    "function surplus() view returns (uint256)",
    "function executeExternalCall(address target, uint256 value, bytes calldata data) returns (bytes)",
    "event Mint(address indexed by, address indexed to, uint256 assets, uint256 tokens)",
    "event Redeem(address indexed by, address indexed from, address indexed to, uint256 assets, uint256 tokens)",
    "event ExternalCallExecuted(address indexed target, uint256 value, bytes data, bytes result)"
];

// UpFloorStrategy ABI (Essential functions)
export const STRATEGY_ABI = [
    "function getTokenAddress() view returns (address)",
    "function getActiveTokenIds() view returns (uint256[])",
    "function getActiveAuctionCount() view returns (uint256)",
    "function auctions(uint256 tokenId) view returns (bool active, uint256 auctionId, uint256 tokenId, uint256 startTime, uint256 currentPrice, uint256 startPrice, uint256 endPrice)",
    "function currentAuctionPrice(uint256 tokenId) view returns (uint256)",
    "function minSellPrice() view returns (uint256)",
    "function maxAuctionDuration() view returns (uint256)",
    "function startAuction(uint256 tokenId, uint256 startPrice, uint256 endPrice) returns (uint256)",
    "function cancelAuctionListing(uint256 tokenId)",
    "function acceptBid(uint256 tokenId)",
    "function proposeAuction(uint256 tokenId, uint256 startPrice, uint256 endPrice) returns (uint256)",
    "function approveAuctionProposal(uint256 proposalId) returns (uint256)",
    "function rejectAuctionProposal(uint256 proposalId)",
    "function getPendingProposalIds() view returns (uint256[])",
    "function getProposal(uint256 proposalId) view returns (uint256 proposalId, uint256 tokenId, address proposer, uint256 startPrice, uint256 endPrice, uint256 proposedAt, uint8 status)",
    "function hasPendingProposal(uint256 tokenId) view returns (bool)",
    "function setMinSellPrice(uint256 newMinSellPrice)",
    "event AuctionStarted(uint256 indexed auctionId, uint256 indexed tokenId, uint256 startPrice, uint256 endPrice)",
    "event AuctionSettled(uint256 indexed auctionId, uint256 indexed tokenId, address indexed buyer, uint256 price)",
    "event AuctionCancelled(uint256 indexed auctionId, uint256 indexed tokenId)",
    "event AuctionProposed(uint256 indexed proposalId, uint256 indexed tokenId, address indexed proposer, uint256 startPrice, uint256 endPrice)",
    "event AuctionProposalApproved(uint256 indexed proposalId, uint256 indexed tokenId, uint256 indexed auctionId)",
    "event AuctionProposalRejected(uint256 indexed proposalId, uint256 indexed tokenId)",
    "event BidAccepted(uint256 indexed auctionId, uint256 indexed tokenId, address indexed buyer, uint256 price)"
];

// MintRouter ABI
export const ROUTER_ABI = [
    "function token() view returns (address)",
    "function mint(uint256 amount, address receiver) payable"
];

// NFT Collection ABI
export const NFT_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address to, uint256 tokenId)",
    "function safeTransferFrom(address from, address to, uint256 tokenId)",
    "function getApproved(uint256 tokenId) view returns (address)",
    "function isApprovedForAll(address owner, address operator) view returns (bool)",
    "function setApprovalForAll(address operator, bool approved)"
];

// Factory ABI
export const FACTORY_ABI = [
    "function deployStrategyToken(string memory _name, string memory _symbol, address _nftCollection, address _collectionOwnerAddress) returns (address token, address router, address strategy)"
];
