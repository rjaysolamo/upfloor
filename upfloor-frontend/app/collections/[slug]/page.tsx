"use client"

import React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import BidBopHeader from "@/components/bidbop-header"
import BidBopFooter from "@/components/bidbop-footer"
import { chainConfigs } from "@/lib/chainlist"
import { useAccount, usePublicClient, useWalletClient } from "wagmi"
import { createPublicClient, http, formatUnits, encodeFunctionData, parseEther } from "viem"
import { useToast } from "@/components/ui/use-toast"
import { useTheme } from "@/components/theme-provider"

// Collection data interface
interface CollectionData {
  id: number;
  collection_name: string;
  collection_owner: string;
  chain_id: number;
  token_address: string;
  router_address: string;
  strategy_address: string;
  royalties_address: string;
  deployer_address: string;
  transaction_hash: string;
  block_number: number;
  token_symbol: string;
  collection_image?: string;
  website?: string;
  twitter?: string;
  discord?: string;
  telegram_id?: string;
  opensea_slug?: string;
  total_supply?: number;
  listed_count?: number;
  floor_price?: string;
  market_cap?: string;
  opensea_data_updated_at?: string;
  created_at: string;
  updated_at: string;
  network_name: string;
  explorer_base_url: string;
}

// Proposal interface
interface Proposal {
  id: string;
  tokenId: string;
  proposer: string;
  startPrice: string;
  endPrice: string;
  status: string;
  timestamp: string;
}

// Auction interface
interface Auction {
  tokenId: string;
  startPrice: string;
  endPrice: string;
  currentPrice: string;
  startTime: string;
  endTime: string;
  active: boolean;
}

// NFT interface for owned tokens
interface OwnedNFT {
  id: string;
  name: string;
  owner: string;
  listed?: boolean;
  price?: number;
  location?: 'token' | 'strategy';  // Track where the NFT is
}

const dummyNfts = [
  { id: 101, name: "Monadoon #101", price: 0.12, owner: "0x8a...1F", listed: true },
  { id: 202, name: "Monadoon #202", price: 0.18, owner: "0xb7...9C", listed: false },
  { id: 303, name: "Monadoon #303", price: 0.22, owner: "0x3f...A7", listed: true },
]

// Strategy contract ABI for proposals and auctions
const STRATEGY_ABI = [
  {
    "inputs": [],
    "name": "getPendingProposalIds",
    "outputs": [{ "internalType": "uint256[]", "name": "proposalIds", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "proposalId", "type": "uint256" }],
    "name": "getProposal",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "proposalId", "type": "uint256" },
          { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
          { "internalType": "address", "name": "proposer", "type": "address" },
          { "internalType": "uint256", "name": "startPrice", "type": "uint256" },
          { "internalType": "uint256", "name": "endPrice", "type": "uint256" },
          { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
          { "internalType": "enum AuctionHouse.ProposalStatus", "name": "status", "type": "uint8" }
        ],
        "internalType": "struct AuctionHouse.AuctionProposal",
        "name": "proposal",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
    "name": "auctions",
    "outputs": [
      { "internalType": "uint256", "name": "startPrice", "type": "uint256" },
      { "internalType": "uint256", "name": "endPrice", "type": "uint256" },
      { "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "internalType": "uint256", "name": "endTime", "type": "uint256" },
      { "internalType": "bool", "name": "active", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
    "name": "currentAuctionPrice",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "proposalId", "type": "uint256" }],
    "name": "approveAuctionProposal",
    "outputs": [{ "internalType": "uint256", "name": "auctionId", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "proposalId", "type": "uint256" }],
    "name": "rejectAuctionProposal",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// ERC-20 Token ABI (for TAIKO token balanceOf)
const ERC20_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export default function CollectionManager() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const search = useSearchParams()
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { isDarkMode } = useTheme()

  // State for collection data
  const [collectionData, setCollectionData] = useState<CollectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openseaData, setOpenseaData] = useState<{
    total_supply?: number;
    listed_count?: number;
    floor_price?: string;
    market_cap?: string;
    last_updated?: string;
    cached?: boolean;
  } | null>(null)

  // Check if current user is the collection owner (deployer)
  const isOwner = useMemo(() => {
    if (!isConnected || !address || !collectionData) return false
    return address.toLowerCase() === collectionData.deployer_address.toLowerCase()
  }, [isConnected, address, collectionData])

  // State for rewards management
  const [rewardPercentage, setRewardPercentage] = useState("200") // 2% in basis points
  const [currentRewardPercentage, setCurrentRewardPercentage] = useState<number | null>(null)
  const [maxRewardPercentage, setMaxRewardPercentage] = useState<number | null>(null)
  const [rewardLoading, setRewardLoading] = useState(false)
  const [rewardError, setRewardError] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [contractBalance, setContractBalance] = useState<number | null>(null)
  const [contractBalanceLoading, setContractBalanceLoading] = useState(false)

  // NFT balance and owned tokens state
  const [nftBalance, setNftBalance] = useState<number>(0)
  const [ownedNfts, setOwnedNfts] = useState<OwnedNFT[]>([])
  const [nftLoading, setNftLoading] = useState(false)
  const [nftError, setNftError] = useState<string | null>(null)
  const [nftsLoaded, setNftsLoaded] = useState(false)

  // Sell modal state
  const [sellModalOpen, setSellModalOpen] = useState(false)
  const [selectedNft, setSelectedNft] = useState<OwnedNFT | null>(null)
  const [sellStep, setSellStep] = useState<'transfer' | 'auction'>('transfer')
  const [startPrice, setStartPrice] = useState('')
  const [endPrice, setEndPrice] = useState('')
  const [transferring, setTransferring] = useState(false)
  const [listing, setListing] = useState(false)
  const [sellError, setSellError] = useState<string | null>(null)
  const [checkingOwnership, setCheckingOwnership] = useState(false)

  // Auction listings state
  const [activeAuctions, setActiveAuctions] = useState<any[]>([])
  const [auctionsLoading, setAuctionsLoading] = useState(false)
  const [cancellingAuction, setCancellingAuction] = useState<string | null>(null)

  // Proposals and auctions state
  const [pendingProposals, setPendingProposals] = useState<Proposal[]>([])
  const [activeAuctionsList, setActiveAuctionsList] = useState<Auction[]>([])
  const [proposalsLoading, setProposalsLoading] = useState(false)
  const [proposalsError, setProposalsError] = useState<string | null>(null)

  // Profile management state
  const [profileData, setProfileData] = useState({
    collection_image: '',
    website: '',
    opensea_slug: '',
    twitter: '',
    discord: '',
    telegram_id: ''
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')

  // Buy NFT state
  const [floorListing, setFloorListing] = useState<any>(null)
  const [loadingFloorPrice, setLoadingFloorPrice] = useState(false)
  const [buyingNFT, setBuyingNFT] = useState(false)
  const [buyError, setBuyError] = useState<string | null>(null)
  const [noListingsModalOpen, setNoListingsModalOpen] = useState(false)

  const { data: walletClient } = useWalletClient()
  const { toast } = useToast()

  const ethUsd = 3500
  const rewardUsd = useMemo(() => (Number.parseFloat(rewardPercentage || "0") / 100 * ethUsd).toFixed(2), [rewardPercentage])

  // Get image from collection data or fallback to search param or default
  const img = collectionData?.collection_image || search?.get("img") || "/brand/doonprofile.png"

  // Get addresses from collection data or fallback to dummy data
  const tokenAddress = collectionData?.token_address || "0xAbCDEF0123456789abCDEF0123456789ABcDeF01"
  const strategyAddress = collectionData?.strategy_address || "0x1111222233334444555566667777888899990000"
  const collectionAddress = collectionData?.collection_owner || "0x1111222233334444555566667777888899990000"

  // Fetch marketplace data (OpenSea or Magic Eden)
  const fetchMarketplaceData = async (chainId: number, identifier: string) => {
    try {
      const marketplace = getMarketplace(chainId);
      console.log('?? fetchMarketplaceData called:', {
        chainId,
        identifier,
        marketplace
      });

      if (marketplace === 'magiceden') {
        // OPTIMIZED: Fetch from fast database cache first
        console.log('? Fetching Magic Eden stats from database for contract:', identifier);
        const statsResponse = await fetch(`/api/magiceden/stats/${identifier}`);

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setOpenseaData(statsData.data); // Set data immediately from cache
          console.log('? Magic Eden stats loaded from cache (instant):', statsData.data);

          // If data is stale (older than 20 minutes), trigger background refresh
          if (statsData.data.is_stale) {
            console.log(' Data is stale (>20min), triggering background sync...');
            // Background sync - don't await, let it update async
            fetch(`/api/magiceden/sync/${identifier}`).then(syncResponse => {
              if (syncResponse.ok) {
                syncResponse.json().then(syncData => {
                  setOpenseaData(syncData.data);
                  console.log('? Magic Eden data refreshed in background:', syncData.data);
                });
              }
            }).catch(err => console.error('Background sync failed:', err));
          }
        } else {
          // Fallback to sync if stats endpoint fails
          console.log('?? Stats endpoint failed, falling back to sync');
          const response = await fetch(`/api/magiceden/sync/${identifier}`);
          if (response.ok) {
            const data = await response.json();
            setOpenseaData(data.data);
            console.log('? Magic Eden data synced (fallback):', data.data);
          }
        }
      } else if (marketplace === 'okidori') {
        // OPTIMIZED: Fetch Okidori data from fast database cache first
        console.log('? Fetching Okidori stats from database for contract:', identifier);
        const statsResponse = await fetch(`/api/okidori/stats/${identifier}`);

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setOpenseaData(statsData.data); // Set data immediately from cache
          console.log('? Okidori stats loaded from cache (instant):', statsData.data);

          // If data is stale (older than 20 minutes), trigger background refresh
          if (statsData.data.is_stale) {
            console.log('?? Data is stale (>20min), triggering background sync...');
            // Background sync - don't await, let it update async
            fetch(`/api/okidori/sync/${identifier}`).then(syncResponse => {
              if (syncResponse.ok) {
                syncResponse.json().then(syncData => {
                  setOpenseaData(syncData.data);
                  console.log('? Okidori data refreshed in background:', syncData.data);
                });
              }
            }).catch(err => console.error('Background sync failed:', err));
          }
        } else {
          // Fallback to sync if stats endpoint fails
          console.log('?? Stats endpoint failed, falling back to sync');
          const response = await fetch(`/api/okidori/sync/${identifier}`);
          if (response.ok) {
            const data = await response.json();
            setOpenseaData(data.data);
            console.log('? Okidori data synced (fallback):', data.data);
          }
        }
      } else {
        // OPTIMIZED: Fetch OpenSea data from fast database cache first
        console.log('? Fetching OpenSea stats from database for slug:', identifier);
        const statsResponse = await fetch(`/api/opensea/stats/${identifier}`);

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setOpenseaData(statsData.data); // Set data immediately from cache
          console.log('? OpenSea stats loaded from cache (instant):', statsData.data);

          // If data is stale (older than 20 minutes), trigger background refresh
          if (statsData.data.is_stale) {
            console.log('?? Data is stale (>20min), triggering background sync...');
            // Background sync - don't await, let it update async
            fetch(`/api/opensea/${identifier}`).then(syncResponse => {
              if (syncResponse.ok) {
                syncResponse.json().then(syncData => {
                  setOpenseaData(syncData.data);
                  console.log('? OpenSea data refreshed in background:', syncData.data);
                });
              }
            }).catch(err => console.error('Background sync failed:', err));
          }
        } else {
          // Fallback to sync if stats endpoint fails
          console.log('?? Stats endpoint failed, falling back to sync');
          const response = await fetch(`/api/opensea/${identifier}`);
          if (response.ok) {
            const data = await response.json();
            setOpenseaData(data.data);
            console.log('? OpenSea data synced (fallback):', data.data);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching marketplace data:", err);
    }
  };

  // Fetch collection data on component mount
  useEffect(() => {
    const fetchCollectionData = async () => {
      if (!slug) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/collections/${slug}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Collection not found");
          } else {
            setError("Failed to load collection data");
          }
          return;
        }

        const data = await response.json();
        setCollectionData(data.collection);

        console.log('?? Collection data loaded:', {
          name: data.collection.collection_name,
          symbol: data.collection.token_symbol,
          chain_id: data.collection.chain_id,
          collection_owner: data.collection.collection_owner,
          token_address: data.collection.token_address
        });

        // Fetch marketplace data based on chain
        if (data.collection.chain_id === 10143) {
          // Monad Testnet - use Magic Eden with NFT contract address (collection_owner)
          console.log('?? Chain 10143 (Monad) detected, using Magic Eden');
          if (data.collection.collection_owner) {
            await fetchMarketplaceData(data.collection.chain_id, data.collection.collection_owner);
          }
        } else if (data.collection.chain_id === 167000) {
          // Taiko Mainnet - use Okidori with NFT contract address (collection_owner)
          console.log('?? Chain 167000 (Taiko) detected, using Okidori');
          console.log('   collection_owner:', data.collection.collection_owner);
          if (data.collection.collection_owner) {
            await fetchMarketplaceData(data.collection.chain_id, data.collection.collection_owner);
          } else {
            console.error('? No collection_owner found for Taiko collection!');
          }
        } else if (data.collection.opensea_slug) {
          // Other chains - use OpenSea with slug
          console.log('?? Using OpenSea for chain', data.collection.chain_id);
          await fetchMarketplaceData(data.collection.chain_id, data.collection.opensea_slug);
        }
      } catch (err) {
        console.error("Error fetching collection data:", err);
        setError("Failed to load collection data");
      } finally {
        setLoading(false);
      }
    };

    fetchCollectionData();
  }, [slug]);

  // Fetch contract balance when collection data is available
  useEffect(() => {
    const fetchContractBalance = async () => {
      if (!collectionData?.token_address || !publicClient) return;

      try {
        setContractBalanceLoading(true);

        let balance: bigint;

        // For Taiko chain (167000), fetch TAIKO token balance instead of native balance
        if (collectionData.chain_id === 167000) {
          const TAIKO_TOKEN_ADDRESS = "0xA9d23408b9bA935c230493c40C73824Df71A0975";

          try {
            // First, verify the TAIKO token contract exists by checking code
            const code = await publicClient.getBytecode({
              address: TAIKO_TOKEN_ADDRESS as `0x${string}`
            });

            if (!code || code === '0x') {
              console.warn(`?? TAIKO token contract not found at ${TAIKO_TOKEN_ADDRESS} on Taiko chain`);
              setContractBalance(null);
              return;
            }

            // Verify we're on the correct chain
            const chainId = await publicClient.getChainId();
            if (chainId !== 167000) {
              console.warn(`?? Wrong chain! Expected 167000 (Taiko), got ${chainId}. Cannot fetch TAIKO balance.`);
              setContractBalance(null);
              return;
            }

            console.log(`Checking TAIKO balance for token contract: ${collectionData.token_address}`);

            // Try to read the balance
            balance = await publicClient.readContract({
              address: TAIKO_TOKEN_ADDRESS as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [collectionData.token_address as `0x${string}`]
            }) as bigint;

            console.log(`? Fetched TAIKO balance for ${collectionData.token_address}:`, balance.toString());
          } catch (taikoError: any) {
            console.error("Error fetching TAIKO token balance:", taikoError);

            // More specific error handling
            if (taikoError?.message?.includes('returned no data')) {
              console.warn(`?? TAIKO token contract returned no data. Possible issues:
                - Contract doesn't support balanceOf
                - RPC endpoint missing contract data
                - Wrong contract address: ${TAIKO_TOKEN_ADDRESS}
              `);
            } else if (taikoError?.message?.includes('does not have the function')) {
              console.warn('?? TAIKO token contract does not have balanceOf function');
            } else {
              console.warn('?? Unknown error:', taikoError?.message || taikoError);
            }

            // Don't fallback - just set to null for Taiko (TAIKO token balance is required)
            console.log('?? Setting contract balance to null - TAIKO token balance unavailable');
            setContractBalance(null);
            return;
          }
        } else {
          // For other chains, fetch native currency balance
          balance = await publicClient.getBalance({
            address: collectionData.token_address as `0x${string}`
          });
        }

        const balanceInNative = Number(balance) / 1e18;
        setContractBalance(balanceInNative);
      } catch (error) {
        console.error("Error fetching contract balance:", error);
        setContractBalance(null);
      } finally {
        setContractBalanceLoading(false);
      }
    };

    fetchContractBalance();
  }, [collectionData?.token_address, collectionData?.chain_id, publicClient]);

  // Fetch current reward settings when collection data is available
  useEffect(() => {
    const fetchRewardSettings = async () => {
      if (!collectionData?.token_address || !publicClient) return;

      try {
        setRewardLoading(true);
        setRewardError(null);

        const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
        if (!chainConfig?.rpcUrl) {
          throw new Error(`No RPC URL found for chain ID ${collectionData.chain_id}`);
        }

        const client = createPublicClient({
          transport: http(chainConfig.rpcUrl),
        });

        // Token ABI for reward functions
        const tokenAbi = [
          {
            name: 'getRewardPercentage',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ name: '', type: 'uint256' }]
          }
        ] as const;

        const currentPercentage = await client.readContract({
          address: collectionData.token_address as `0x${string}`,
          abi: tokenAbi,
          functionName: 'getRewardPercentage'
        });

        setCurrentRewardPercentage(Number(currentPercentage));
        setMaxRewardPercentage(null); // No max percentage available
        setRewardPercentage(Number(currentPercentage).toString());

        console.log('Reward settings loaded:', {
          current: Number(currentPercentage),
          max: null
        });

      } catch (error) {
        console.error("Error fetching reward settings:", error);
        setRewardError(error instanceof Error ? error.message : 'Failed to fetch reward settings');
      } finally {
        setRewardLoading(false);
      }
    };

    fetchRewardSettings();
  }, [collectionData?.token_address, collectionData?.chain_id, publicClient]);

  // Auto-fetch NFTs: collection_owner is NFT contract, fetch from both token_address and strategy_address
  useEffect(() => {
    const fetchAllNFTs = async () => {
      if (collectionData?.collection_owner && collectionData?.token_address && !nftsLoaded) {
        console.log('Auto-fetching NFTs from contract:', collectionData.collection_owner);

        // Fetch NFTs from token_address
        console.log('Fetching NFTs owned by token_address:', collectionData.token_address);
        await fetchNFTBalance(collectionData.token_address, collectionData);

        // Also fetch NFTs from strategy_address
        if (collectionData.strategy_address) {
          console.log('Fetching NFTs owned by strategy_address:', collectionData.strategy_address);
          await fetchNFTBalance(collectionData.strategy_address, collectionData, true);
        }

        // Also fetch active auctions to show listing status
        if (collectionData.strategy_address) {
          console.log('Auto-fetching active auctions to show listing status');
          await fetchActiveAuctions();
        }
      }
    };

    fetchAllNFTs();
  }, [collectionData?.collection_owner, collectionData?.token_address, collectionData?.strategy_address]);

  // Auto-fetch proposals and auctions for approval when collection data is available
  useEffect(() => {
    if (collectionData?.strategy_address && isOwner) {
      console.log('Auto-fetching proposals and auctions for approval...');
      fetchProposalsAndAuctions();
    }
  }, [collectionData?.strategy_address, isOwner]);

  // Initialize profile data when collectionData loads
  useEffect(() => {
    if (collectionData) {
      setProfileData({
        collection_image: collectionData.collection_image || '',
        website: collectionData.website || '',
        opensea_slug: collectionData.opensea_slug || '',
        twitter: collectionData.twitter || '',
        discord: collectionData.discord || '',
        telegram_id: collectionData.telegram_id || ''
      });
    }
  }, [collectionData]);

  // Utility function to get currency symbol based on chain ID
  const getCurrencySymbol = (chainId: number | undefined) => {
    if (!chainId) return 'ETH';
    // Special case for Taiko chain - display TAIKO instead of ETH
    if (chainId === 167000) return 'TAIKO';
    const config = Object.values(chainConfigs).find(c => c.id === chainId);
    return config?.currency || 'ETH';
  };

  // Handle image file upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (PNG, JPG, GIF, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      console.log('Image preview created:', result ? 'Yes' : 'No', 'Length:', result?.length);
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/...;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Update profile function
  const handleUpdateProfile = async () => {
    if (!collectionData?.token_symbol) return;

    try {
      setProfileLoading(true);

      let imageBase64 = profileData.collection_image;

      // If a new image file is selected, convert it to base64
      if (imageFile) {
        imageBase64 = await fileToBase64(imageFile);
      } else if (profileData.collection_image && !profileData.collection_image.startsWith('data:')) {
        // If it's already base64 from database, keep it as is
        imageBase64 = profileData.collection_image;
      } else {
        // If it's a data URL, extract the base64 part
        imageBase64 = profileData.collection_image.split(',')[1] || '';
      }

      const response = await fetch(`/api/collections/${collectionData.token_symbol}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collection_image: imageBase64,
          website: profileData.website,
          opensea_slug: profileData.opensea_slug,
          twitter: profileData.twitter,
          discord: profileData.discord,
          telegram_id: profileData.telegram_id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to update profile`);
      }

      toast({
        title: "Profile Updated",
        description: "Your collection profile has been updated successfully!",
      });

      // Clear the file input
      setImageFile(null);
      setImagePreview('');

      // Refresh collection data by refetching
      window.location.reload();

    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // Map chain ID to OpenSea chain name
  const getOpenSeaChainName = (chainId: number | undefined) => {
    const chainMap: { [key: number]: string } = {
      1: 'ethereum',
      137: 'matic',
      10: 'optimism',
      42161: 'arbitrum',
      8453: 'base',
      33139: 'ape_chain',
      11155111: 'sepolia'
    };
    return chainMap[chainId || 1] || 'ethereum';
  };

  // Determine which marketplace to use based on chain ID
  const getMarketplace = (chainId: number | undefined) => {
    if (chainId === 10143) {
      return 'magiceden'; // Monad Testnet uses Magic Eden
    }
    if (chainId === 167000) {
      return 'okidori'; // Taiko Mainnet uses Okidori
    }
    return 'opensea'; // Default to OpenSea for other chains
  };

  // Utility functions for formatting OpenSea data
  const formatWeiToEth = (wei: string) => {
    if (!wei) return '0';

    // Handle scientific notation and very large numbers
    let weiValue: string;
    if (wei.includes('e+') || wei.includes('E+')) {
      // Convert scientific notation to string using Number.toLocaleString with no formatting
      const num = parseFloat(wei);
      weiValue = num.toLocaleString('fullwide', { useGrouping: false });
    } else {
      weiValue = wei;
    }

    try {
      const eth = BigInt(weiValue) / BigInt('1000000000000000000');
      const remainder = BigInt(weiValue) % BigInt('1000000000000000000');
      const decimals = Number(remainder) / 1e18;
      const value = Number(eth) + decimals;
      // Remove trailing zeros and unnecessary decimal places
      return value % 1 === 0 ? value.toString() : value.toFixed(4).replace(/\.?0+$/, '');
    } catch (error) {
      // Fallback for very large numbers that can't be handled by BigInt
      const numValue = parseFloat(wei);
      const ethValue = numValue / 1e18;
      return ethValue % 1 === 0 ? ethValue.toString() : ethValue.toFixed(4).replace(/\.?0+$/, '');
    }
  };

  const formatMarketCap = (marketCap: string, chainId: number | undefined) => {
    if (!marketCap) return '0';
    // Market cap is already calculated as floor_price * total_supply in the API
    const eth = formatWeiToEth(marketCap);
    const num = parseFloat(eth);
    const currency = getCurrencySymbol(chainId);

    if (num >= 1000000) {
      const mValue = num / 1000000;
      const formattedM = mValue % 1 === 0 ? mValue.toString() : mValue.toFixed(2).replace(/\.?0+$/, '');
      return `${formattedM}M ${currency}`;
    } else if (num >= 1000) {
      const kValue = num / 1000;
      const formattedK = kValue % 1 === 0 ? kValue.toString() : kValue.toFixed(2).replace(/\.?0+$/, '');
      return `${formattedK}K ${currency}`;
    }
    return `${eth} ${currency}`;
  };

  const copy = (t: string) => {
    try {
      navigator.clipboard?.writeText(t)
    } catch { }
  }

  // NFT fetching functions - Database-first approach
  const fetchNFTBalance = async (ownerAddr: string, collectionData: CollectionData, append = false) => {
    if (!ownerAddr || !collectionData) return;

    try {
      if (!append) {
        setNftLoading(true);
        setNftError(null);
      }

      console.log(' Fetching NFT balance:', {
        owner: ownerAddr,
        collection: collectionData.token_symbol,
        chainId: collectionData.chain_id
      });

      // Step 1: Fetch owned NFTs from database
      let tokenIds: string[] = [];
      let dbSuccess = false;

      try {
        console.log(' Fetching NFTs from database...');
        const dbResponse = await fetch(`/api/collections/${collectionData.token_symbol}/nfts`);

        if (dbResponse.ok) {
          const dbData = await dbResponse.json();
          if (dbData.success && dbData.nfts && Array.isArray(dbData.nfts)) {
            tokenIds = dbData.nfts.map((nft: any) => nft.tokenId);
            dbSuccess = true;
            console.log(`? Loaded ${tokenIds.length} NFTs from database:`, tokenIds);
          }
        }
      } catch (dbError) {
        console.warn('?? Failed to fetch from database, will use on-chain method:', dbError);
      }

      // Step 2: Get on-chain balance to verify or as fallback
      const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
      if (!chainConfig?.rpcUrl) {
        throw new Error(`No RPC URL found for chain ID ${collectionData.chain_id}`);
      }

      const client = createPublicClient({
        transport: http(chainConfig.rpcUrl),
      });

      const erc721Abi = [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'owner', type: 'address' }],
          outputs: [{ name: 'balance', type: 'uint256' }],
        },
        {
          name: 'tokenOfOwnerByIndex',
          type: 'function',
          stateMutability: 'view',
          inputs: [
            { name: 'owner', type: 'address' },
            { name: 'index', type: 'uint256' }
          ],
          outputs: [{ name: 'tokenId', type: 'uint256' }],
        },
        {
          name: 'ownerOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'tokenId', type: 'uint256' }],
          outputs: [{ name: 'owner', type: 'address' }],
        },
        {
          name: 'totalSupply',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ name: 'totalSupply', type: 'uint256' }],
        }
      ] as const;

      const nftContractAddress = collectionData.collection_owner;
      const ownerAddress = ownerAddr;

      const balance = await client.readContract({
        address: nftContractAddress as `0x${string}`,
        abi: erc721Abi,
        functionName: 'balanceOf',
        args: [ownerAddress as `0x${string}`],
      } as any);

      const balanceNumber = Number(balance);
      console.log(` On-chain balance: ${balanceNumber} NFTs`);

      if (!append) {
        setNftBalance(balanceNumber);
      }

      // If database has data and matches on-chain balance, use it
      if (dbSuccess && tokenIds.length === balanceNumber && tokenIds.length > 0) {
        console.log(' Using database data (matches on-chain balance)');

        const location: 'token' | 'strategy' = ownerAddress.toLowerCase() === collectionData.strategy_address?.toLowerCase() ? 'strategy' : 'token';
        const nfts: OwnedNFT[] = tokenIds.map(tokenId => ({
          id: tokenId,
          name: `${collectionData.collection_name} #${tokenId}`,
          owner: ownerAddress,
          listed: false,
          location: location,
        }));

        if (append) {
          setOwnedNfts(prevNfts => {
            const combined = [...prevNfts, ...nfts];
            const unique = combined.filter((nft, index, self) =>
              index === self.findIndex(t => t.id === nft.id)
            );
            setNftBalance(unique.length);
            return unique;
          });
        } else {
          setOwnedNfts(nfts);
        }

        setNftsLoaded(true);
        return;
      }

      // If balance is 0, no need to enumerate
      if (balanceNumber === 0) {
        if (!append) {
          setOwnedNfts([]);
          setNftsLoaded(true);
        }
        return;
      }

      // Step 3: Fallback to on-chain enumeration if database doesn't match
      console.log(' Database mismatch or empty, enumerating on-chain...');
      tokenIds = []; // Reset

      // Method 1: Try tokenOfOwnerByIndex first (more efficient)
      let method1Success = false;

      try {
        console.log('Trying method 1: tokenOfOwnerByIndex');
        for (let i = 0; i < balanceNumber; i++) {
          try {
            const tokenId = await client.readContract({
              address: nftContractAddress as `0x${string}`,
              abi: erc721Abi,
              functionName: 'tokenOfOwnerByIndex',
              args: [ownerAddress as `0x${string}`, BigInt(i)],
            } as any);

            let tokenIdStr: string;
            if (typeof tokenId === 'bigint' || typeof tokenId === 'number') {
              tokenIdStr = tokenId.toString();
            } else if (typeof tokenId === 'string') {
              try {
                if (tokenId.startsWith('0x')) {
                  tokenIdStr = BigInt(tokenId).toString();
                } else {
                  tokenIdStr = tokenId;
                }
              } catch (stringParseErr) {
                throw new Error(`Invalid tokenId string: ${tokenId}`);
              }
            } else {
              throw new Error(`Unsupported tokenId type: ${typeof tokenId}`);
            }

            tokenIds.push(tokenIdStr);

          } catch (err) {
            if (i === 0) {
              console.log('tokenOfOwnerByIndex not supported, falling back to ownerOf method');
              throw new Error('tokenOfOwnerByIndex not supported or failed');
            }
          }
        }

        if (tokenIds.length === balanceNumber) {
          method1Success = true;
          console.log('Method 1 successful:', tokenIds);
        } else {
          throw new Error(`Method 1 incomplete: got ${tokenIds.length}/${balanceNumber} tokens`);
        }
      } catch (err) {
        console.log('Method 1 failed, will try Method 2:', err instanceof Error ? err.message : 'Unknown error');
        tokenIds.length = 0;
      }

      // Method 2: Fallback to ownerOf if method 1 fails
      if (!method1Success) {
        console.log('Trying method 2: ownerOf enumeration');

        let maxCheck = 10000;
        try {
          const totalSupply = await client.readContract({
            address: nftContractAddress as `0x${string}`,
            abi: erc721Abi,
            functionName: 'totalSupply',
          } as any);
          maxCheck = Math.min(Number(totalSupply), 10000);
          console.log(`Using totalSupply: ${maxCheck} tokens to check`);
        } catch (err) {
          console.warn('totalSupply not available, using default range:', err instanceof Error ? err.message : 'Unknown error');
          maxCheck = Math.min(10000, balanceNumber * 20);
        }

        console.log(`Checking token IDs 1 to ${maxCheck}`);

        for (let id = 1; id <= maxCheck && tokenIds.length < balanceNumber; id++) {
          try {
            const owner = await client.readContract({
              address: nftContractAddress as `0x${string}`,
              abi: erc721Abi,
              functionName: 'ownerOf',
              args: [BigInt(id)],
            } as any);

            if (typeof owner === 'string' && owner.toLowerCase() === ownerAddress.toLowerCase()) {
              tokenIds.push(id.toString());
              if (id % 10 === 0 || tokenIds.length === balanceNumber) {
                console.log(`Found owned token ID: ${id} (${tokenIds.length}/${balanceNumber})`);
              }
            }
          } catch (err) {
            // Token doesn't exist or is burned, continue
          }
        }

        console.log(`Method 2 found ${tokenIds.length}/${balanceNumber} tokens`);
      }

      // Create NFT objects
      const location: 'token' | 'strategy' = ownerAddress.toLowerCase() === collectionData.strategy_address?.toLowerCase() ? 'strategy' : 'token';
      const nfts: OwnedNFT[] = tokenIds.map(tokenId => ({
        id: tokenId,
        name: `${collectionData.collection_name} #${tokenId}`,
        owner: ownerAddress,
        listed: false,
        location: location,
      }));

      if (append) {
        setOwnedNfts(prevNfts => {
          const combined = [...prevNfts, ...nfts];
          const unique = combined.filter((nft, index, self) =>
            index === self.findIndex(t => t.id === nft.id)
          );
          setNftBalance(unique.length);
          return unique;
        });
      } else {
        setOwnedNfts(nfts);
        setNftBalance(tokenIds.length);
      }

      setNftsLoaded(true);
      console.log('? Successfully loaded NFTs:', nfts.length, 'Append mode:', append);

    } catch (error) {
      console.error('? Error fetching NFT balance:', error);
      if (!append) {
        setNftError(error instanceof Error ? error.message : 'Failed to fetch NFT balance');
      }
    } finally {
      if (!append) {
        setNftLoading(false);
      }
    }
  };

  // Helper function to remove NFT from database after it's sold
  const removeNFTFromDatabase = async (tokenId: string) => {
    if (!collectionData) return;

    try {
      console.log(` Removing NFT #${tokenId} from database...`);

      const response = await fetch(
        `/api/collections/${collectionData.token_symbol}/nfts?tokenId=${tokenId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        console.log(`? NFT #${tokenId} removed from database`);

        // Update local state to reflect the removal
        setOwnedNfts(prevNfts => prevNfts.filter(nft => nft.id !== tokenId));
        setNftBalance(prev => Math.max(0, prev - 1));

        return true;
      } else {
        const errorData = await response.json();
        console.error('Failed to remove NFT from database:', errorData);
        return false;
      }
    } catch (error) {
      console.error('Error removing NFT from database:', error);
      return false;
    }
  };

  // Update reward percentage
  const handleUpdateRewardPercentage = async () => {
    if (!collectionData || !walletClient || !address) return;

    const newPercentage = parseInt(rewardPercentage);

    // Validation
    if (isNaN(newPercentage) || newPercentage < 0) {
      setRewardError('Please enter a valid reward percentage');
      return;
    }

    // Note: maxRewardPercentage is no longer available, so we skip this validation

    if (currentRewardPercentage && newPercentage === currentRewardPercentage) {
      setRewardError('Reward percentage is already set to this value');
      return;
    }

    try {
      setRewardLoading(true);
      setRewardError(null);

      const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
      if (!chainConfig?.rpcUrl) {
        throw new Error(`No RPC URL found for chain ID ${collectionData.chain_id}`);
      }

      console.log('Updating reward percentage:', {
        tokenAddress: collectionData.token_address,
        newPercentage,
        currentPercentage: currentRewardPercentage
      });

      // Token ABI for setRewardPercentage function
      const tokenAbi = [
        {
          name: 'setRewardPercentage',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'percentage', type: 'uint256' }],
          outputs: []
        }
      ] as const;

      const hash = await walletClient.writeContract({
        address: collectionData.token_address as `0x${string}`,
        abi: tokenAbi,
        functionName: 'setRewardPercentage',
        args: [BigInt(newPercentage)],
        account: address
      });

      console.log('Reward update transaction submitted:', hash);

      // Wait for confirmation
      const client = createPublicClient({
        transport: http(chainConfig.rpcUrl),
      });

      const receipt = await client.waitForTransactionReceipt({ hash });
      console.log('Reward update confirmed:', receipt);

      // Update local state
      setCurrentRewardPercentage(newPercentage);

      toast({
        title: 'Success!',
        description: `Reward percentage updated to ${newPercentage} basis points (${newPercentage / 100}%)`,
      });

    } catch (error: any) {
      console.error('Error updating reward percentage:', error);

      const errorMessage = error?.message || '';
      const isUserRejection =
        errorMessage.includes('User rejected') ||
        errorMessage.includes('user rejected') ||
        error?.code === 4001;

      if (isUserRejection) {
        setRewardError('Transaction rejected by user');
      } else if (errorMessage.includes('InvalidRewardPercentage')) {
        setRewardError('Reward percentage exceeds maximum allowed');
      } else if (errorMessage.includes('Ownable: caller is not the owner')) {
        setRewardError('Only the contract owner can set reward percentage');
      } else {
        setRewardError(error instanceof Error ? error.message : 'Failed to update reward percentage');
      }
    } finally {
      setRewardLoading(false);
    }
  };

  // Check if NFT is already in strategy
  const checkNftInStrategy = async (tokenId: string): Promise<boolean> => {
    if (!collectionData) return false;

    try {
      const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
      if (!chainConfig?.rpcUrl) return false;

      const client = createPublicClient({
        transport: http(chainConfig.rpcUrl),
      });

      const ERC721_ABI = [{
        name: 'ownerOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        outputs: [{ name: 'owner', type: 'address' }]
      }];

      const owner = await client.readContract({
        address: collectionData.collection_owner as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'ownerOf',
        args: [BigInt(tokenId)]
      }) as string;

      console.log('NFT owner check:', {
        tokenId,
        currentOwner: owner,
        strategyAddress: collectionData.strategy_address,
        isInStrategy: owner.toLowerCase() === collectionData.strategy_address.toLowerCase()
      });

      return owner.toLowerCase() === collectionData.strategy_address.toLowerCase();
    } catch (error) {
      console.error('Error checking NFT owner:', error);
      return false;
    }
  };

  // Handle sell button click
  const handleSellClick = async (nft: OwnedNFT) => {
    setSelectedNft(nft);
    setStartPrice('');
    setEndPrice('');
    setSellError(null);
    setCheckingOwnership(true);
    setSellModalOpen(true);

    // Check if NFT is already in strategy
    const inStrategy = await checkNftInStrategy(nft.id);

    if (inStrategy) {
      console.log('NFT already in strategy, skipping to auction step');
      setSellStep('auction');
    } else {
      console.log('NFT not in strategy, need to transfer first');
      setSellStep('transfer');
    }

    setCheckingOwnership(false);
  };

  // Transfer NFT to strategy contract
  const handleTransferToStrategy = async () => {
    if (!selectedNft || !collectionData || !walletClient || !address) return;

    try {
      setTransferring(true);
      setSellError(null);

      const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
      if (!chainConfig?.rpcUrl) {
        throw new Error(`No RPC URL found for chain ID ${collectionData.chain_id}`);
      }

      // ERC721 safeTransferFrom ABI
      const transferCalldata = encodeFunctionData({
        abi: [{
          name: 'safeTransferFrom',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'tokenId', type: 'uint256' }
          ],
          outputs: []
        }],
        functionName: 'safeTransferFrom',
        args: [
          collectionData.token_address as `0x${string}`,      // from (token owns it)
          collectionData.strategy_address as `0x${string}`,   // to (strategy will own it)
          BigInt(selectedNft.id)                              // tokenId
        ]
      });

      // Execute transfer via token contract's executeExternalCall
      const hash = await walletClient.writeContract({
        address: collectionData.token_address as `0x${string}`,
        abi: [{
          name: 'executeExternalCall',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'target', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'data', type: 'bytes' }
          ],
          outputs: [{ name: '', type: 'bytes' }]
        }],
        functionName: 'executeExternalCall',
        args: [
          collectionData.collection_owner as `0x${string}`,  // NFT contract
          BigInt(0),                                         // value
          transferCalldata                                   // calldata
        ],
        account: address
      });

      console.log('Transfer transaction submitted:', hash);

      // Wait for confirmation
      const client = createPublicClient({
        transport: http(chainConfig.rpcUrl),
      });

      const receipt = await client.waitForTransactionReceipt({ hash });
      console.log('Transfer confirmed:', receipt);

      // Move to auction step
      setSellStep('auction');
      setTransferring(false);

    } catch (error) {
      console.error('Transfer error:', error);
      setSellError(error instanceof Error ? error.message : 'Failed to transfer NFT');
      setTransferring(false);
    }
  };

  // Fetch active auctions
  const fetchActiveAuctions = async () => {
    if (!collectionData?.strategy_address) return;

    try {
      setAuctionsLoading(true);

      const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
      if (!chainConfig?.rpcUrl) {
        throw new Error(`No RPC URL found for chain ID ${collectionData.chain_id}`);
      }

      const client = createPublicClient({
        transport: http(chainConfig.rpcUrl),
      });

      // Strategy ABI for auction functions
      const strategyAbi = [
        {
          name: 'getActiveTokenIds',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ name: '', type: 'uint256[]' }]
        },
        {
          name: 'auctions',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'tokenId', type: 'uint256' }],
          outputs: [
            { name: 'active', type: 'bool' },
            { name: 'auctionId', type: 'uint256' },
            { name: 'tokenId', type: 'uint256' },
            { name: 'startTime', type: 'uint256' },
            { name: 'currentPrice', type: 'uint256' },
            { name: 'startPrice', type: 'uint256' },
            { name: 'endPrice', type: 'uint256' }
          ]
        },
        {
          name: 'currentAuctionPrice',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'tokenId', type: 'uint256' }],
          outputs: [{ name: 'price', type: 'uint256' }]
        }
      ];

      // Get active token IDs
      const activeTokenIds = await client.readContract({
        address: collectionData.strategy_address as `0x${string}`,
        abi: strategyAbi,
        functionName: 'getActiveTokenIds'
      }) as bigint[];

      console.log('Active auction token IDs:', activeTokenIds);

      // Fetch auction details for each token
      const auctions = [];
      for (const tokenId of activeTokenIds) {
        try {
          const auction = await client.readContract({
            address: collectionData.strategy_address as `0x${string}`,
            abi: strategyAbi,
            functionName: 'auctions',
            args: [tokenId]
          }) as any;

          const currentPrice = await client.readContract({
            address: collectionData.strategy_address as `0x${string}`,
            abi: strategyAbi,
            functionName: 'currentAuctionPrice',
            args: [tokenId]
          }) as bigint;

          // Auction is returned as array/tuple: [active, auctionId, tokenId, startTime, currentPrice, startPrice, endPrice]
          const [active, auctionId, , startTime, , startPrice, endPrice] = Array.isArray(auction) ? auction : [
            auction.active,
            auction.auctionId,
            auction.tokenId,
            auction.startTime,
            auction.currentPrice,
            auction.startPrice,
            auction.endPrice
          ];

          const auctionData = {
            tokenId: tokenId.toString(),
            auctionId: auctionId?.toString() || '',
            active: active || false,
            startPrice: startPrice?.toString() || '0',
            endPrice: endPrice?.toString() || '0',
            currentPrice: currentPrice?.toString() || '0',
            startTime: startTime?.toString() || '0',
          };

          console.log(`Auction for token ${tokenId}:`, auctionData);
          auctions.push(auctionData);
        } catch (err) {
          console.error(`Error fetching auction for token ${tokenId}:`, err);
        }
      }

      setActiveAuctions(auctions);
      console.log('Fetched auctions summary:', auctions);

    } catch (error) {
      console.error('Error fetching active auctions:', error);
    } finally {
      setAuctionsLoading(false);
    }
  };

  // Fetch pending proposals and active auctions for approval
  const fetchProposalsAndAuctions = async () => {
    if (!collectionData?.strategy_address) return;

    try {
      setProposalsLoading(true);
      setProposalsError(null);

      const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
      if (!chainConfig?.rpcUrl) {
        throw new Error(`No RPC URL found for chain ID ${collectionData.chain_id}`);
      }

      const client = createPublicClient({
        transport: http(chainConfig.rpcUrl),
      });

      console.log(' Fetching proposals and auctions for approval...');

      // 1. Fetch pending proposals
      const pendingIds = await client.readContract({
        address: collectionData.strategy_address as `0x${string}`,
        abi: STRATEGY_ABI,
        functionName: 'getPendingProposalIds',
      }) as bigint[];

      console.log(`Found ${pendingIds.length} pending proposals`);

      const proposals: Proposal[] = [];
      for (const id of pendingIds) {
        try {
          const proposalData = await client.readContract({
            address: collectionData.strategy_address as `0x${string}`,
            abi: STRATEGY_ABI,
            functionName: 'getProposal',
            args: [id],
          }) as any;

          console.log('Raw proposal data:', proposalData);
          console.log('Proposer:', proposalData.proposer);
          console.log('Start Price:', formatUnits(proposalData.startPrice, 18));
          console.log('End Price:', formatUnits(proposalData.endPrice, 18));

          proposals.push({
            id: id.toString(),
            tokenId: proposalData.tokenId.toString(),
            proposer: proposalData.proposer,
            startPrice: formatUnits(proposalData.startPrice, 18),
            endPrice: formatUnits(proposalData.endPrice, 18),
            status: proposalData.status === 0 ? 'Pending' : proposalData.status === 1 ? 'Approved' : 'Rejected',
            timestamp: new Date(Number(proposalData.timestamp) * 1000).toLocaleString(),
          });
        } catch (error) {
          console.error(`Error fetching proposal ${id}:`, error);
        }
      }

      setPendingProposals(proposals);

      // 2. Fetch active auctions
      const auctions: Auction[] = [];
      const maxTokenId = 100; // Adjust based on collection size

      for (let tokenId = 1; tokenId <= maxTokenId; tokenId++) {
        try {
          const auction = await client.readContract({
            address: collectionData.strategy_address as `0x${string}`,
            abi: STRATEGY_ABI,
            functionName: 'auctions',
            args: [BigInt(tokenId)],
          }) as [bigint, bigint, bigint, bigint, boolean];

          const [startPrice, endPrice, startTime, endTime, active] = auction;

          if (active) {
            const currentPrice = await client.readContract({
              address: collectionData.strategy_address as `0x${string}`,
              abi: STRATEGY_ABI,
              functionName: 'currentAuctionPrice',
              args: [BigInt(tokenId)],
            }) as bigint;

            auctions.push({
              tokenId: tokenId.toString(),
              startPrice: formatUnits(startPrice, 18),
              endPrice: formatUnits(endPrice, 18),
              currentPrice: formatUnits(currentPrice, 18),
              startTime: new Date(Number(startTime) * 1000).toLocaleString(),
              endTime: new Date(Number(endTime) * 1000).toLocaleString(),
              active: true,
            });
          }
        } catch (error) {
          // Token might not exist, continue
          continue;
        }
      }

      setActiveAuctionsList(auctions);

      console.log('? Successfully fetched proposals and auctions:', {
        proposals: proposals.length,
        auctions: auctions.length,
      });

    } catch (error) {
      console.error('Error fetching proposals and auctions:', error);
      setProposalsError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setProposalsLoading(false);
    }
  };

  // Accept proposal
  const handleAcceptProposal = async (proposalId: string) => {
    if (!walletClient || !address || !collectionData?.strategy_address) {
      toast({
        title: "Error",
        description: "Please connect your wallet",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Accepting proposal:', proposalId);

      // Check if user is the owner
      const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
      if (!chainConfig?.rpcUrl) {
        throw new Error(`No RPC URL found for chain ID ${collectionData.chain_id}`);
      }

      const client = createPublicClient({
        transport: http(chainConfig.rpcUrl),
      });

      const owner = await client.readContract({
        address: collectionData.strategy_address as `0x${string}`,
        abi: STRATEGY_ABI,
        functionName: 'owner',
      });

      if (address.toLowerCase() !== (owner as string).toLowerCase()) {
        toast({
          title: "Error",
          description: "You are not the owner of this strategy",
          variant: "destructive",
        });
        return;
      }

      const hash = await walletClient.writeContract({
        address: collectionData.strategy_address as `0x${string}`,
        abi: STRATEGY_ABI,
        functionName: 'approveAuctionProposal',
        args: [BigInt(proposalId)],
        account: address,
      });

      console.log('Accept proposal transaction submitted:', hash);

      const receipt = await client.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        toast({
          title: "Success",
          description: `Proposal #${proposalId} accepted successfully!`,
        });

        // Refresh proposals
        await fetchProposalsAndAuctions();
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error: any) {
      console.error('Error accepting proposal:', error);

      // Handle user rejection gracefully
      if (error.message?.includes('User rejected') ||
        error.message?.includes('User denied') ||
        error.message?.includes('User rejected the request') ||
        error.message?.includes('MetaMask Tx Signature: User denied transaction signature')) {
        toast({
          title: "Transaction Cancelled",
          description: "You cancelled the transaction. No changes were made.",
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to accept proposal: ${error.message || 'Unknown error'}`,
          variant: "destructive",
        });
      }
    }
  };

  // Reject proposal
  const handleRejectProposal = async (proposalId: string) => {
    if (!walletClient || !address || !collectionData?.strategy_address) {
      toast({
        title: "Error",
        description: "Please connect your wallet",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Rejecting proposal:', proposalId);

      // Check if user is the owner
      const rejectChainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
      if (!rejectChainConfig?.rpcUrl) {
        throw new Error(`No RPC URL found for chain ID ${collectionData.chain_id}`);
      }

      const rejectClient = createPublicClient({
        transport: http(rejectChainConfig.rpcUrl),
      });

      const owner = await rejectClient.readContract({
        address: collectionData.strategy_address as `0x${string}`,
        abi: STRATEGY_ABI,
        functionName: 'owner',
      });

      if (address.toLowerCase() !== (owner as string).toLowerCase()) {
        toast({
          title: "Error",
          description: "You are not the owner of this strategy",
          variant: "destructive",
        });
        return;
      }

      const hash = await walletClient.writeContract({
        address: collectionData.strategy_address as `0x${string}`,
        abi: STRATEGY_ABI,
        functionName: 'rejectAuctionProposal',
        args: [BigInt(proposalId)],
        account: address,
      });

      console.log('Reject proposal transaction submitted:', hash);

      const receipt = await rejectClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        toast({
          title: "Success",
          description: `Proposal #${proposalId} rejected successfully!`,
        });

        // Refresh proposals
        await fetchProposalsAndAuctions();
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error: any) {
      console.error('Error rejecting proposal:', error);

      // Handle user rejection gracefully
      if (error.message?.includes('User rejected') ||
        error.message?.includes('User denied') ||
        error.message?.includes('User rejected the request') ||
        error.message?.includes('MetaMask Tx Signature: User denied transaction signature')) {
        toast({
          title: "Transaction Cancelled",
          description: "You cancelled the transaction. No changes were made.",
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to reject proposal: ${error.message || 'Unknown error'}`,
          variant: "destructive",
        });
      }
    }
  };

  // Cancel auction
  const handleCancelAuction = async (tokenId: string) => {
    console.log('Cancel auction clicked for token:', tokenId);
    console.log('Strategy address:', collectionData?.strategy_address);
    console.log('Wallet client:', walletClient ? 'Connected' : 'Not connected');
    console.log('Address:', address);

    if (!collectionData?.strategy_address) {
      console.error('No strategy address');
      toast({
        title: "Error",
        description: "Strategy address not found",
        variant: "destructive",
      });
      return;
    }

    if (!walletClient) {
      console.error('No wallet client');
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to cancel auctions",
        variant: "destructive",
      });
      return;
    }

    if (!address) {
      console.error('No address');
      toast({
        title: "Error",
        description: "Wallet address not found",
        variant: "destructive",
      });
      return;
    }

    try {
      setCancellingAuction(tokenId);

      console.log('Calling cancelAuctionListing with:', {
        strategyAddress: collectionData.strategy_address,
        tokenId: tokenId,
        account: address
      });

      const hash = await walletClient.writeContract({
        address: collectionData.strategy_address as `0x${string}`,
        abi: [{
          name: 'cancelAuctionListing',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'tokenId', type: 'uint256' }],
          outputs: []
        }],
        functionName: 'cancelAuctionListing',
        args: [BigInt(tokenId)],
        account: address
      });

      console.log('Cancel auction transaction submitted:', hash);

      const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
      if (chainConfig?.rpcUrl) {
        const client = createPublicClient({
          transport: http(chainConfig.rpcUrl),
        });
        console.log('Waiting for transaction receipt...');
        const receipt = await client.waitForTransactionReceipt({ hash });
        console.log('Transaction receipt:', receipt);
      }

      console.log('Auction cancelled successfully');
      toast({
        title: "Success",
        description: "Auction cancelled successfully! NFT returned to your wallet.",
      });

      // Refresh auctions list
      await fetchActiveAuctions();

      // Refresh NFTs list
      if (collectionData?.token_address) {
        await fetchNFTBalance(collectionData.token_address, collectionData);
        if (collectionData.strategy_address) {
          await fetchNFTBalance(collectionData.strategy_address, collectionData, true);
        }
      }

    } catch (error: any) {
      console.error('Cancel auction error:', error);

      // Check if user rejected the transaction
      const errorMessage = error?.message || '';
      const errorDetails = error?.details || '';
      const errorName = error?.name || '';

      const isUserRejection =
        errorMessage.includes('User rejected') ||
        errorMessage.includes('user rejected') ||
        errorMessage.includes('denied transaction') ||
        errorDetails.includes('User denied') ||
        errorDetails.includes('user denied') ||
        errorName === 'UserRejectedRequestError' ||
        error?.code === 4001 ||
        error?.code === 'ACTION_REJECTED';

      if (isUserRejection) {
        toast({
          title: "Transaction Rejected",
          description: "You rejected the transaction in your wallet",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error Cancelling Auction",
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          variant: "destructive",
        });
      }
    } finally {
      setCancellingAuction(null);
    }
  };

  // Start auction listing
  const handleStartAuction = async () => {
    if (!selectedNft || !collectionData || !walletClient || !address) return;
    if (!startPrice || !endPrice) {
      setSellError('Please enter both start and end prices');
      return;
    }

    try {
      setListing(true);
      setSellError(null);

      const startPriceWei = parseEther(startPrice);
      const endPriceWei = parseEther(endPrice);

      const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
      if (!chainConfig?.rpcUrl) {
        throw new Error(`No RPC URL found for chain ID ${collectionData.chain_id}`);
      }

      console.log('Starting auction with params:', {
        strategyAddress: collectionData.strategy_address,
        collectionOwner: collectionData.collection_owner,
        tokenAddress: collectionData.token_address,
        routerAddress: collectionData.router_address,
        tokenId: selectedNft.id,
        startPrice: startPrice,
        endPrice: endPrice,
        startPriceWei: startPriceWei.toString(),
        endPriceWei: endPriceWei.toString()
      });

      // Call startAuction on strategy contract
      const hash = await walletClient.writeContract({
        address: collectionData.strategy_address as `0x${string}`,
        abi: [{
          name: 'startAuction',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'tokenId', type: 'uint256' },
            { name: 'startPrice', type: 'uint256' },
            { name: 'endPrice', type: 'uint256' }
          ],
          outputs: [{ name: 'auctionId', type: 'uint256' }]
        }],
        functionName: 'startAuction',
        args: [
          BigInt(selectedNft.id),
          startPriceWei,
          endPriceWei
        ],
        account: address
      });

      console.log('Auction transaction submitted:', hash);

      // Wait for confirmation
      const client = createPublicClient({
        transport: http(chainConfig.rpcUrl),
      });

      const receipt = await client.waitForTransactionReceipt({ hash });
      console.log('Auction confirmed:', receipt);

      // Success - close modal and refresh NFTs
      setSellModalOpen(false);
      setListing(false);

      // Refresh NFTs list
      if (collectionData?.token_address) {
        fetchNFTBalance(collectionData.token_address, collectionData);
      }

      // Refresh auctions list
      await fetchActiveAuctions();

    } catch (error) {
      console.error('Auction error:', error);
      setSellError(error instanceof Error ? error.message : 'Failed to start auction');
      setListing(false);
    }
  };

  // Fetch floor price listing from marketplace (OpenSea or Magic Eden)
  const fetchFloorListing = async () => {
    const marketplace = getMarketplace(collectionData?.chain_id);

    try {
      setLoadingFloorPrice(true);
      setBuyError(null);

      if (marketplace === 'magiceden') {
        // Magic Eden for Monad Testnet
        if (!collectionData?.collection_owner) {
          console.error('No contract address configured');
          setBuyError('No contract address configured');
          return;
        }

        console.log(' Fetching floor listing from Magic Eden for:', collectionData.collection_owner);

        const response = await fetch(`/api/magiceden/floor-price/${collectionData.collection_owner}`);

        console.log(' Magic Eden API Response Status:', response.status);

        if (!response.ok) {
          // Handle different error cases
          if (response.status === 404) {
            console.log(' No listings found for this collection');
            setNoListingsModalOpen(true);
            setLoadingFloorPrice(false);
            return;
          }

          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }

          console.error('? Magic Eden API Error:', errorData);
          throw new Error(errorData.error || `Failed to fetch listings: ${response.status}`);
        }

        const data = await response.json();
        console.log('? Magic Eden API Response:', data);

        if (!data.success || !data.listing) {
          console.log(' No listings found in response');
          setNoListingsModalOpen(true);
          setLoadingFloorPrice(false);
          return;
        }

        const listing = data.listing;

        // Format the listing data for Magic Eden
        const formattedListing = {
          orderId: listing.orderId,
          tokenId: listing.tokenId,
          nftContractAddress: listing.contract,
          priceWei: BigInt(listing.price),
          currency: listing.currency,
          maker: listing.maker,
          validUntil: listing.validUntil,
          source: listing.source,
          kind: listing.kind,
          rawData: listing.rawData,
          marketplace: 'magiceden',
        };

        console.log(' Magic Eden floor listing found:', {
          contract: formattedListing.nftContractAddress,
          tokenId: formattedListing.tokenId,
          price: formatUnits(formattedListing.priceWei, 18),
          currency: formattedListing.currency,
          orderId: formattedListing.orderId,
        });

        setFloorListing(formattedListing);
        toast({
          title: 'Floor Price Loaded!',
          description: `Found NFT #${formattedListing.tokenId} for ${formatUnits(formattedListing.priceWei, 18)} ${formattedListing.currency}`,
        });
      } else if (marketplace === 'okidori') {
        // Okidori for Taiko Mainnet
        if (!collectionData?.collection_owner) {
          console.error('No contract address configured');
          setBuyError('No contract address configured');
          return;
        }

        console.log('??? Fetching floor listing from Okidori for:', collectionData.collection_owner);

        const response = await fetch(`/api/okidori/floor-price/${collectionData.collection_owner}`);

        console.log('?? Okidori API Response Status:', response.status);

        if (!response.ok) {
          // Handle different error cases
          if (response.status === 404) {
            console.log('? No listings found for this collection');
            setNoListingsModalOpen(true);
            setLoadingFloorPrice(false);
            return;
          }

          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }

          console.error('? Okidori API Error:', errorData);
          throw new Error(errorData.error || `Failed to fetch listings: ${response.status}`);
        }

        const data = await response.json();
        console.log('? Okidori API Response:', data);

        if (!data.success || !data.listing) {
          console.log('? No listings found in response');
          setNoListingsModalOpen(true);
          setLoadingFloorPrice(false);
          return;
        }

        const listing = data.listing;

        // Format the listing data for Okidori
        // IMPORTANT: Use on-chain listing ID, not database ID
        const listingIdOnChain = listing.listingIdOnChain || listing.orderId || listing.id;

        const formattedListing = {
          orderId: listing.orderId,
          listingIdOnChain: listingIdOnChain, // On-chain listing ID for buyNFT transaction
          tokenId: listing.tokenId,
          nftContractAddress: listing.contract,
          priceWei: BigInt(listing.price),
          currency: listing.currency,
          maker: listing.maker,
          seller: listing.seller || listing.maker,
          validUntil: listing.validUntil,
          source: listing.source,
          kind: listing.kind,
          rawData: listing.rawData,
          marketplace: 'okidori',
        };

        console.log('? Okidori listing data:', {
          listingId: listingIdOnChain + ' (on-chain listing ID)',
          priceHuman: formatUnits(formattedListing.priceWei, 18) + ' TAIKO',
          priceWei: formattedListing.priceWei.toString(),
          currency: formattedListing.currency,
          tokenId: formattedListing.tokenId,
          seller: formattedListing.seller
        });
        console.log('?? Note: Using listingIdOnChain from API, not database ID');

        setFloorListing(formattedListing);
        toast({
          title: 'Floor Price Loaded!',
          description: `Found NFT #${formattedListing.tokenId} for ${formatUnits(formattedListing.priceWei, 18)} ${formattedListing.currency}`,
        });
      } else {
        // OpenSea for other chains
        if (!collectionData?.opensea_slug) {
          console.error('No OpenSea slug configured');
          setBuyError('No OpenSea slug configured');
          return;
        }

        console.log(' Fetching floor listing from OpenSea for:', collectionData.opensea_slug);

        const response = await fetch(`/api/floor-price/${collectionData.opensea_slug}`);

        console.log(' OpenSea API Response Status:', response.status);

        if (!response.ok) {
          // Handle different error cases
          if (response.status === 404) {
            console.log(' No listings found for this collection');
            setNoListingsModalOpen(true);
            setLoadingFloorPrice(false);
            return;
          }

          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }

          console.error('? OpenSea API Error:', errorData);
          throw new Error(errorData.error || `Failed to fetch listings: ${response.status}`);
        }

        const data = await response.json();
        console.log('? OpenSea API Response:', data);

        if (!data.success || !data.listing) {
          console.log(' No listings found in response');
          setNoListingsModalOpen(true);
          setLoadingFloorPrice(false);
          return;
        }

        const listing = data.listing;

        // Format the listing data for OpenSea
        const formattedListing = {
          order_hash: listing.orderHash,
          chain: listing.chain,
          protocol_address: listing.protocolAddress,
          protocol_data: listing.protocolData,
          nftContractAddress: listing.nftContractAddress,
          tokenId: listing.tokenId,
          priceWei: BigInt(listing.price),
          currency: listing.currency,
          type: listing.type,
          marketplace: 'opensea',
        };

        console.log(' OpenSea floor listing found:', {
          contract: formattedListing.nftContractAddress,
          tokenId: formattedListing.tokenId,
          price: formatUnits(formattedListing.priceWei, 18),
          currency: formattedListing.currency,
          orderHash: formattedListing.order_hash,
        });

        setFloorListing(formattedListing);
        toast({
          title: 'Floor Price Loaded!',
          description: `Found NFT #${formattedListing.tokenId} for ${formatUnits(formattedListing.priceWei, 18)} ${formattedListing.currency}`,
        });
      }
    } catch (error: any) {
      console.error('? Error fetching floor listing:', error);
      const errorMessage = error?.message || 'Failed to fetch floor price';
      setBuyError(errorMessage);
      toast({
        title: 'Error Loading Floor Price',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingFloorPrice(false);
    }
  };

  // Buy NFT at floor price
  const handleBuyFloorNFT = async () => {
    console.log(' Buy button clicked!');
    console.log(' Setting buying state to true...');
    console.log('Prerequisites check:', {
      hasFloorListing: !!floorListing,
      hasCollectionData: !!collectionData,
      hasWalletClient: !!walletClient,
      hasAddress: !!address,
      hasPublicClient: !!publicClient
    });

    if (!floorListing || !collectionData || !walletClient || !address || !publicClient) {
      console.error('? Missing required data:', {
        floorListing: !!floorListing,
        collectionData: !!collectionData,
        walletClient: !!walletClient,
        address: !!address,
        publicClient: !!publicClient
      });
      return;
    }

    const marketplace = floorListing.marketplace || getMarketplace(collectionData.chain_id);
    console.log(' Marketplace:', marketplace);

    try {
      setBuyingNFT(true);
      setBuyError(null);

      // Check contract balance
      let contractBalance: bigint;

      // For Taiko chain (167000), fetch TAIKO token balance instead of native balance
      if (collectionData.chain_id === 167000) {
        const TAIKO_TOKEN_ADDRESS = "0xA9d23408b9bA935c230493c40C73824Df71A0975";
        contractBalance = await publicClient.readContract({
          address: TAIKO_TOKEN_ADDRESS as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [collectionData.token_address as `0x${string}`]
        });
      } else {
        // For other chains, fetch native currency balance
        contractBalance = await publicClient.getBalance({
          address: collectionData.token_address as `0x${string}`
        });
      }

      if (contractBalance < floorListing.priceWei) {
        throw new Error(
          `Insufficient funds: needs ${formatUnits(floorListing.priceWei, 18)} ${floorListing.currency}, available ${formatUnits(contractBalance, 18)}`
        );
      }

      if (marketplace === 'magiceden') {
        // Magic Eden purchase flow
        console.log(' Preparing Magic Eden purchase...');
        console.log('Purchase params:', {
          contract: floorListing.nftContractAddress,
          tokenId: floorListing.tokenId,
          taker: collectionData.token_address,
        });

        const buyResponse = await fetch('/api/magiceden/buy', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            contract: floorListing.nftContractAddress,
            tokenId: floorListing.tokenId,
            taker: collectionData.token_address, // Payment contract is the buyer
          }),
        });

        console.log(' Buy API response status:', buyResponse.status);

        if (!buyResponse.ok) {
          const errorData = await buyResponse.json();
          throw new Error(errorData.error || `Failed to prepare buy transaction: ${buyResponse.status}`);
        }

        const buyData = await buyResponse.json();

        if (!buyData.success || !buyData.transactions || buyData.transactions.length === 0) {
          throw new Error('Invalid transaction data received from Magic Eden');
        }

        console.log(' Got transaction data from Magic Eden:', buyData);

        // Execute each transaction via executeExternalCall
        for (const tx of buyData.transactions) {
          console.log('Executing Magic Eden transaction:', {
            to: tx.to,
            value: tx.value,
            tokenAddress: collectionData.token_address
          });

          const hash = await walletClient.writeContract({
            address: collectionData.token_address as `0x${string}`,
            abi: [{
              name: 'executeExternalCall',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [
                { name: 'target', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'data', type: 'bytes' }
              ],
              outputs: [{ name: '', type: 'bytes' }]
            }],
            functionName: 'executeExternalCall',
            args: [
              tx.to as `0x${string}`,
              BigInt(tx.value || '0'),
              tx.data as `0x${string}`
            ],
            account: address,
            gas: 1000000n
          });

          console.log('Purchase transaction submitted:', hash);

          // Wait for confirmation
          const receipt = await publicClient.waitForTransactionReceipt({ hash });

          if (receipt.status !== 'success') {
            throw new Error('Transaction failed');
          }
        }

        console.log(' Purchase successful! Showing success toast...');
        toast({
          title: 'Floor Sweep! ??',
          description: `NFT #${floorListing.tokenId} purchased for ${formatUnits(floorListing.priceWei, 18)} ${floorListing.currency} on Magic Eden`,
        });

        // Save purchased token ID to database
        try {
          await fetch(`/api/collections/${collectionData.token_symbol}/nfts`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              tokenId: floorListing.tokenId,
              marketplace: 'magiceden',
            }),
          });
          console.log(`? Saved token #${floorListing.tokenId} to database (owned_nfts)`);
        } catch (dbError) {
          console.error('? Failed to save token to database:', dbError);
          // Don't throw - purchase was successful even if DB save fails
        }

        // Clear floor listing to stop automatic buy attempts - user must manually trigger next purchase
        setFloorListing(null);
        console.log('? Floor sweep complete - cleared floor listing. User must manually fetch next floor price.');

      } else if (marketplace === 'okidori') {
        // Okidori purchase flow for Taiko Mainnet
        console.log('?? Preparing Okidori purchase...');
        console.log('Purchase params:', {
          contract: floorListing.nftContractAddress,
          tokenId: floorListing.tokenId,
          listingId: floorListing.listingIdOnChain || floorListing.orderId,
          buyer: collectionData.token_address,
        });

        // Step 1: Get buy transaction data from API
        const buyResponse = await fetch('/api/okidori/buy', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            contract: floorListing.nftContractAddress,
            tokenId: floorListing.tokenId,
            buyer: collectionData.token_address,
          }),
        });

        console.log('?? Okidori buy API response status:', buyResponse.status);

        if (!buyResponse.ok) {
          const errorData = await buyResponse.json();
          throw new Error(errorData.error || `Failed to prepare buy transaction: ${buyResponse.status}`);
        }

        const buyData = await buyResponse.json();

        if (!buyData.success || !buyData.transactions || buyData.transactions.length === 0) {
          throw new Error('Invalid transaction data received from Okidori');
        }

        console.log('? Got transaction data from Okidori:', buyData);

        // IMPORTANT: Use on-chain listing ID, not database ID
        const onChainPrice = BigInt(buyData.price);

        console.log('? Okidori listing data:', {
          listingId: (floorListing.listingIdOnChain || floorListing.orderId) + ' (on-chain listing ID)',
          priceHuman: formatUnits(onChainPrice, 18) + ' TAIKO',
          priceWei: onChainPrice.toString(),
          currency: buyData.currency,
          tokenId: buyData.tokenId,
          seller: buyData.seller
        });
        console.log('?? Note: Using listingIdOnChain from API, not database ID');

        // Step 1: Check token contract's TAIKO balance
        console.log('\n?? Step 1: Checking token contract TAIKO balance...');

        // Execute each transaction via executeExternalCall
        for (const tx of buyData.transactions) {
          console.log('?? Executing Okidori transaction:', {
            type: tx.type,
            to: tx.to,
            functionName: tx.functionName,
            tokenAddress: collectionData.token_address
          });

          // Encode the transaction data
          let callData: `0x${string}`;

          if (tx.type === 'approve') {
            // Check current allowance first
            const TAIKO_TOKEN_ADDRESS = "0xA9d23408b9bA935c230493c40C73824Df71A0975";
            const currentAllowance = await publicClient.readContract({
              address: TAIKO_TOKEN_ADDRESS as `0x${string}`,
              abi: tx.checkAllowance.abi,
              functionName: tx.checkAllowance.functionName,
              args: tx.checkAllowance.args,
            }) as bigint;

            console.log(`?? Current TAIKO allowance: ${formatUnits(currentAllowance, 18)}`);
            console.log(`?? Required TAIKO: ${formatUnits(BigInt(tx.checkAllowance.requiredAmount), 18)}`);

            if (currentAllowance >= BigInt(tx.checkAllowance.requiredAmount)) {
              console.log('? Sufficient allowance, skipping approve');
              continue;
            }

            // Encode approve transaction
            callData = encodeFunctionData({
              abi: tx.abi,
              functionName: tx.functionName,
              args: tx.args,
            });
          } else {
            // Encode buyNFT transaction - use listingIdOnChain
            // Priority: 1) buyData.listingId (API prioritizes listingIdOnChain), 2) buyData.listingIdOnChain, 3) floorListing.listingIdOnChain, 4) fallback
            const listingIdToUse = buyData.listingId || buyData.listingIdOnChain || floorListing.listingIdOnChain || floorListing.orderId;

            const source = buyData.listingId && listingIdToUse === buyData.listingId ? 'buyData.listingId (API - prioritized listingIdOnChain)' :
              buyData.listingIdOnChain && listingIdToUse === buyData.listingIdOnChain ? 'buyData.listingIdOnChain' :
                floorListing.listingIdOnChain && listingIdToUse === floorListing.listingIdOnChain ? 'floorListing.listingIdOnChain' :
                  'floorListing.orderId';

            console.log(`?? Using listing ID for buyNFT: ${listingIdToUse}`, {
              source,
              onChain: !!(buyData.listingIdOnChain || floorListing.listingIdOnChain),
              apiListingId: buyData.listingId,
              apiListingIdOnChain: buyData.listingIdOnChain,
              floorListingIdOnChain: floorListing.listingIdOnChain
            });

            if (!buyData.listingId && !buyData.listingIdOnChain && !floorListing.listingIdOnChain) {
              console.warn('?? WARNING: No listingIdOnChain found! Using fallback ID which may cause transaction to fail.');
            }

            callData = encodeFunctionData({
              abi: tx.abi,
              functionName: tx.functionName,
              args: [BigInt(listingIdToUse)], // Use on-chain listing ID
            });
          }

          const hash = await walletClient.writeContract({
            address: collectionData.token_address as `0x${string}`,
            abi: [{
              name: 'executeExternalCall',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [
                { name: 'target', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'data', type: 'bytes' }
              ],
              outputs: [{ name: '', type: 'bytes' }]
            }],
            functionName: 'executeExternalCall',
            args: [
              tx.to as `0x${string}`,
              BigInt(tx.value || '0'),
              callData
            ],
            account: address,
            gas: 1000000n
          });

          console.log('? Purchase transaction submitted:', hash);

          // Wait for confirmation
          const receipt = await publicClient.waitForTransactionReceipt({ hash });

          if (receipt.status !== 'success') {
            throw new Error('Transaction failed');
          }

          console.log('? Transaction confirmed:', receipt.transactionHash);
        }

        console.log('? Purchase successful! Showing success toast...');
        const purchasedTokenId = buyData.tokenId || floorListing.tokenId;
        toast({
          title: 'Floor Sweep! ??',
          description: `NFT #${purchasedTokenId} purchased for ${formatUnits(buyData.price, 18)} ${buyData.currency} on Okidori`,
        });

        // Save purchased token ID to database
        // Use buyData.tokenId (confirmed from API) as primary source, fallback to floorListing.tokenId
        try {
          await fetch(`/api/collections/${collectionData.token_symbol}/nfts`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              tokenId: purchasedTokenId,
              marketplace: 'okidori',
            }),
          });
          console.log(`? Saved token #${purchasedTokenId} to database (owned_nfts)`);
        } catch (dbError) {
          console.error('? Failed to save token to database:', dbError);
          // Don't throw - purchase was successful even if DB save fails
        }

        // Clear floor listing to stop automatic buy attempts - user must manually trigger next purchase
        setFloorListing(null);
        console.log('? Floor sweep complete - cleared floor listing. User must manually fetch next floor price.');

      } else {
        // OpenSea purchase flow (original code)
        console.log(' Generating OpenSea fulfillment data...');

        const fulfillmentResponse = await fetch('/api/fulfillment-data', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            orderHash: floorListing.order_hash,
            chain: getOpenSeaChainName(collectionData.chain_id),
            protocolAddress: floorListing.protocol_address || '0x0000000000000068F116a894984e2DB1123eB395',
            fulfillerAddress: collectionData.token_address,
          }),
        });

        if (!fulfillmentResponse.ok) {
          const errorData = await fulfillmentResponse.json();
          throw new Error(errorData.error || `Failed to generate fulfillment data: ${fulfillmentResponse.status}`);
        }

        const fulfillmentJson = await fulfillmentResponse.json();

        if (!fulfillmentJson.success || !fulfillmentJson.fulfillmentData) {
          throw new Error('Invalid fulfillment data received');
        }

        const txData = fulfillmentJson.fulfillmentData.transaction;

        if (!txData?.to || !txData?.input_data) {
          throw new Error('Invalid fulfillment data');
        }

        // Encode the calldata using viem
        const params = txData.input_data.parameters;
        params.additionalRecipients = params.additionalRecipients.map((r: any) => [r.amount, r.recipient]);

        const callData = encodeFunctionData({
          abi: [{
            name: 'fulfillBasicOrder_efficient_6GL6yc',
            type: 'function',
            stateMutability: 'payable',
            inputs: [{
              name: 'parameters',
              type: 'tuple',
              components: [
                { name: 'considerationToken', type: 'address' },
                { name: 'considerationIdentifier', type: 'uint256' },
                { name: 'considerationAmount', type: 'uint256' },
                { name: 'offerer', type: 'address' },
                { name: 'zone', type: 'address' },
                { name: 'offerToken', type: 'address' },
                { name: 'offerIdentifier', type: 'uint256' },
                { name: 'offerAmount', type: 'uint256' },
                { name: 'basicOrderType', type: 'uint8' },
                { name: 'startTime', type: 'uint256' },
                { name: 'endTime', type: 'uint256' },
                { name: 'zoneHash', type: 'bytes32' },
                { name: 'salt', type: 'uint256' },
                { name: 'offererConduitKey', type: 'bytes32' },
                { name: 'fulfillerConduitKey', type: 'bytes32' },
                { name: 'totalOriginalAdditionalRecipients', type: 'uint256' },
                {
                  name: 'additionalRecipients', type: 'tuple[]', components: [
                    { name: 'amount', type: 'uint256' },
                    { name: 'recipient', type: 'address' }
                  ]
                },
                { name: 'signature', type: 'bytes' }
              ]
            }],
            outputs: [{ name: '', type: 'bool' }]
          }],
          functionName: 'fulfillBasicOrder_efficient_6GL6yc',
          args: [params]
        });

        const target = txData.to;
        const value = BigInt(txData.value || floorListing.priceWei);

        console.log('Executing OpenSea purchase via contract:', {
          target,
          value: value.toString(),
          tokenAddress: collectionData.token_address
        });

        // Execute via payment contract's executeExternalCall
        const hash = await walletClient.writeContract({
          address: collectionData.token_address as `0x${string}`,
          abi: [{
            name: 'executeExternalCall',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'target', type: 'address' },
              { name: 'value', type: 'uint256' },
              { name: 'data', type: 'bytes' }
            ],
            outputs: [{ name: '', type: 'bytes' }]
          }],
          functionName: 'executeExternalCall',
          args: [target as `0x${string}`, value, callData],
          account: address,
          gas: 800000n
        });

        console.log('Purchase transaction submitted:', hash);

        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status !== 'success') {
          throw new Error('Transaction failed');
        }

        toast({
          title: 'Floor Sweep! ??',
          description: `NFT #${floorListing.tokenId} purchased for ${formatUnits(floorListing.priceWei, 18)} ${floorListing.currency} on OpenSea`,
        });

        // Save purchased token ID to database
        try {
          await fetch(`/api/collections/${collectionData.token_symbol}/nfts`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              tokenId: floorListing.tokenId,
              marketplace: 'opensea',
            }),
          });
          console.log(`? Saved token #${floorListing.tokenId} to database (owned_nfts)`);
        } catch (dbError) {
          console.error('? Failed to save token to database:', dbError);
          // Don't throw - purchase was successful even if DB save fails
        }

        // Clear floor listing to stop automatic buy attempts - user must manually trigger next purchase
        setFloorListing(null);
        console.log('? Floor sweep complete - cleared floor listing. User must manually fetch next floor price.');
      }

      // Don't automatically fetch new floor listing - user must manually trigger next purchase
      // Removed: await fetchFloorListing();

      // Refresh NFTs
      if (collectionData.token_address) {
        await fetchNFTBalance(collectionData.token_address, collectionData);
      }

    } catch (error: any) {
      console.error('? Buy error:', error);
      const errorMessage = error?.message || '';

      const isUserRejection =
        errorMessage.includes('User rejected') ||
        errorMessage.includes('user rejected') ||
        error?.code === 4001;

      if (isUserRejection) {
        console.log(' User rejected transaction');
        toast({
          title: 'Transaction Rejected',
          description: 'You rejected the transaction in your wallet',
          variant: 'destructive',
        });
      } else {
        console.log(' Purchase failed with error:', errorMessage);
        setBuyError(error instanceof Error ? error.message : 'Failed to buy NFT');
        toast({
          title: 'Purchase Failed',
          description: error instanceof Error ? error.message : 'Failed to buy NFT',
          variant: 'destructive',
        });
      }
    } finally {
      console.log(' Clearing buying state...');
      setBuyingNFT(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <BidBopHeader />
        <main className="mx-auto max-w-6xl px-4 py-10 space-y-8">
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center space-y-8">

              {/* Loading Text with Typewriter Effect */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent animate-pulse">
                  Loading Collection
                </h2>
                <div className="flex items-center justify-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400 ml-3">Fetching NFT data...</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-64 mx-auto">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Preparing your collection view...</p>
              </div>

            </div>
          </div>
        </main>
        <BidBopFooter />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
        : 'bg-gradient-to-br from-gray-50 via-white to-blue-50/30'
        }`}>
        <BidBopHeader />
        <main className="mx-auto max-w-6xl px-4 py-10 space-y-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">??</div>
              <h2 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>Collection Not Found</h2>
              <p className={`mb-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>{error}</p>
              <Button onClick={() => router.push('/')} className="bg-purple-600 hover:bg-purple-700">
                Back to Home
              </Button>
            </div>
          </div>
        </main>
        <BidBopFooter />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode
      ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
      : 'bg-gradient-to-br from-gray-50 via-white to-blue-50/30'
      }`}>
      <BidBopHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 space-y-8">
        <header className="flex items-center justify-between">
          <h1 className={`text-3xl md:text-4xl font-bold text-pretty transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
            {collectionData?.collection_name || slug} Collection
          </h1>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{collectionData?.network_name || 'UpFloor'}</Badge>
            <Button variant="outline" onClick={() => router.push(`/`)}>
              Back Home
            </Button>
          </div>
        </header>

        <section
          className="relative overflow-hidden rounded-2xl p-6 md:p-8"
          style={{
            backgroundImage: "linear-gradient(135deg, #651bd0 0%, #651bcf 55%, #651bcf 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full blur-3xl opacity-30"
            style={{
              background: "radial-gradient(closest-side, rgba(212,7,239,0.6), transparent 70%)",
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full blur-3xl opacity-25"
            style={{
              background: "radial-gradient(closest-side, rgba(1,242,190,0.6), transparent 70%)",
            }}
          />
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-white/15 text-white">{collectionData?.token_symbol || 'Strategy'}</Badge>
                <Badge className="bg-black/20 text-white">{collectionData?.network_name || 'UpFloor'}</Badge>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold">
                Manage {collectionData?.collection_name || slug}
              </h2>
              <p className="mt-1 text-white/85 text-sm">
                Track performance, listings, and configuration for your {collectionData?.token_symbol || 'strategy'} tokens.
              </p>

              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg bg-white/10 p-3">
                  <div className="text-white/70 text-xs">Floor Price</div>
                  <div className="text-white font-semibold">
                    {openseaData?.floor_price ? formatWeiToEth(openseaData.floor_price) + ` ${getCurrencySymbol(collectionData?.chain_id || 1)}` : `0.19 ${getCurrencySymbol(collectionData?.chain_id || 1)}`}
                  </div>
                </div>
                <div className="rounded-lg bg-white/10 p-3">
                  <div className="text-white/70 text-xs">Market Cap</div>
                  <div className="text-white font-semibold">
                    {openseaData?.market_cap ? formatMarketCap(openseaData.market_cap, collectionData?.chain_id || 1) : `+3.42 ${getCurrencySymbol(collectionData?.chain_id || 1)}`}
                  </div>
                </div>
                <div className="rounded-lg bg-white/10 p-3">
                  <div className="text-white/70 text-xs">Total Supply</div>
                  <div className="text-white font-semibold">
                    {openseaData?.total_supply || collectionData?.total_supply || '12.4'}
                  </div>
                </div>
                <div className="rounded-lg bg-white/10 p-3">
                  <div className="text-white/70 text-xs">Listed / Supply</div>
                  <div className="text-white font-semibold">
                    {openseaData?.listed_count !== undefined && openseaData?.total_supply !== undefined
                      ? `${openseaData.listed_count} / ${openseaData.total_supply}`
                      : '1 / 3'}
                  </div>
                </div>
                <div className="rounded-lg bg-white/10 p-3">
                  <div className="text-white/70 text-xs">Contract Balance</div>
                  <div className="text-white font-semibold">
                    {contractBalanceLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                        Loading...
                      </div>
                    ) : contractBalance !== null ? (
                      `${contractBalance.toFixed(4)} ${getCurrencySymbol(collectionData?.chain_id || 1)}`
                    ) : (
                      'N/A'
                    )}
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className={`transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/30 ${isDarkMode ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                  onClick={() => collectionData?.website && window.open(collectionData.website, '_blank')}
                  disabled={!collectionData?.website}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
                  </svg>
                  Website
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className={`transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/30 ${isDarkMode ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                  onClick={() => collectionData?.twitter && window.open(collectionData.twitter.startsWith('http') ? collectionData.twitter : `https://twitter.com/${collectionData.twitter}`, '_blank')}
                  disabled={!collectionData?.twitter}
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  X
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className={`transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/30 ${isDarkMode ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                  onClick={() => collectionData?.discord && window.open(collectionData.discord, '_blank')}
                  disabled={!collectionData?.discord}
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  Discord
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className={`transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/30 ${isDarkMode ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                  onClick={() => collectionData?.opensea_slug && window.open(`https://opensea.io/collection/${collectionData.opensea_slug}`, '_blank')}
                  disabled={!collectionData?.opensea_slug}
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  OpenSea
                </Button>
              </div>

              {isOwner && (
                <div className="mt-5 flex items-center gap-3">
                  {!paused ? (
                    <Button className="bg-black/80 text-white hover:bg-black" onClick={() => setPaused(true)}>
                      Pause Collection
                    </Button>
                  ) : (
                    <Button className="bg-white text-black hover:bg-white/90" onClick={() => setPaused(false)}>
                      Unpause Collection
                    </Button>
                  )}
                  <span className="text-white/80 text-xs">{paused ? "Paused" : "Live"}</span>
                </div>
              )}
            </div>

            <div className="md:col-span-1 flex justify-center">
              <div className="w-full max-w-sm p-4 bg-transparent">
                <img
                  src={img || "/placeholder.svg"}
                  alt={`${collectionData?.collection_name || slug} collection`}
                  className="w-full h-48 md:h-56 object-cover rounded-xl shadow-2xl bg-transparent"
                />
              </div>
            </div>
          </div>
        </section>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="nfts">NFTs</TabsTrigger>
            {isOwner && (
              <>
                <TabsTrigger value="listings">Listings</TabsTrigger>
                <TabsTrigger value="buy">Buy NFTs</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-2">
            {/* Owner-only: Approve Sell Listing */}
            {isOwner && (
              <Card className={`shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] ${isDarkMode
                ? 'bg-gray-800/70 border-gray-700/60'
                : 'bg-white border border-gray-200'
                }`}>
                <CardHeader className={`pb-0 transition-all duration-300 ${isDarkMode
                  ? 'bg-gray-800/70'
                  : 'bg-gradient-to-br from-gray-50 to-purple-50/30'
                  }`}>
                  <CardTitle className={`transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                    Approve Sell Listing
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2 px-4 pb-4">
                  <p className={`mb-3 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                    Review and approve pending auction proposals from users.
                  </p>

                  {proposalsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="relative">
                          <div className="w-12 h-12 border-4 border-purple-200 rounded-full"></div>
                          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <div className="text-center">
                          <div className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>Loading proposals...</div>
                          <div className={`text-xs mt-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>Fetching from blockchain</div>
                        </div>
                      </div>
                    </div>
                  ) : proposalsError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                      <div className="text-red-800 text-sm">
                        Error loading proposals: {proposalsError}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={fetchProposalsAndAuctions}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : pendingProposals.length === 0 ? (
                    <div className={`rounded-lg p-4 text-center transition-colors duration-300 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                      }`}>
                      <div className={`mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}></div>
                      <div className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>No pending proposals</div>
                      <div className={`text-xs mt-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        Proposals will appear here when users submit auction listings
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 mb-3">
                      {pendingProposals.map((proposal) => (
                        <div key={proposal.id} className={`rounded-lg p-3 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                          }`}>
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-lg shadow-md overflow-hidden">
                              <img
                                src={collectionData?.collection_image || "/placeholder.svg"}
                                alt="NFT Preview"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '??';
                                  }
                                }}
                              />
                            </div>
                            <div className="flex-1">
                              <div className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                                }`}>
                                {collectionData?.collection_name} #{proposal.tokenId}
                              </div>
                              <div className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                Proposer: {proposal.proposer && proposal.proposer.length > 10
                                  ? `${proposal.proposer.slice(0, 6)}...${proposal.proposer.slice(-4)}`
                                  : proposal.proposer || 'Unknown'}
                              </div>
                              <div className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                }`}>
                                Price: {parseFloat(proposal.startPrice).toFixed(4)} - {parseFloat(proposal.endPrice).toFixed(4)} {getCurrencySymbol(collectionData?.chain_id)}
                              </div>
                              <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                Submitted: {proposal.timestamp}
                              </div>
                            </div>
                            <div className="flex flex-col space-y-2">
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  className="bg-green-100 hover:bg-green-200 text-green-700 border border-green-200"
                                  onClick={() => handleAcceptProposal(proposal.id)}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-red-100 hover:bg-red-200 text-red-700 border border-red-200"
                                  onClick={() => handleRejectProposal(proposal.id)}
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeAuctionsList.length > 0 && (
                    <div className="mt-4">
                      <h4 className={`text-sm font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>Active Auctions</h4>
                      <div className="space-y-2">
                        {activeAuctionsList.map((auction) => (
                          <div key={auction.tokenId} className={`rounded-lg p-3 transition-colors duration-300 ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'
                            }`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                                  }`}>
                                  {collectionData?.collection_name} #{auction.tokenId}
                                </div>
                                <div className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                  }`}>
                                  Current: {parseFloat(auction.currentPrice).toFixed(4)} {getCurrencySymbol(collectionData?.chain_id)}
                                </div>
                                <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                  }`}>
                                  Ends: {auction.endTime}
                                </div>
                              </div>
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                Active
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <div className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      {pendingProposals.length} pending proposals ? {activeAuctionsList.length} active auctions
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchProposalsAndAuctions}
                      disabled={proposalsLoading}
                    >
                      {proposalsLoading ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Show connection prompt for non-owners */}
            {!isConnected && (
              <Card className={`shadow-lg rounded-xl transition-colors duration-300 ${isDarkMode
                ? 'bg-gray-800/70 border-gray-700/60'
                : 'bg-white border border-gray-200'
                }`}>
                <CardContent className="p-6 text-center">
                  <div className={`mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}></div>
                  <h3 className={`font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>Connect Wallet</h3>
                  <p className={`text-sm mb-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                    Connect your wallet to access collection management features if you're the owner.
                  </p>
                  <Button className={`transition-colors duration-300 ${isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 hover:border-gray-500'
                    : 'text-white'
                    }`} style={!isDarkMode ? { backgroundColor: '#651bcf' } : {}}>
                    Connect Wallet
                  </Button>
                </CardContent>
              </Card>
            )}


            <Card className={`shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105 ${isDarkMode
              ? 'bg-gray-800/70 border-gray-700/60'
              : 'bg-white border border-gray-200'
              }`}>
              <CardHeader className={`pb-4 transition-all duration-300 ${isDarkMode
                ? 'bg-gray-800/70'
                : 'bg-gradient-to-br from-gray-50 to-purple-50/30'
                }`}>
                <CardTitle className={`transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Floor</div>
                  <div className="font-semibold">
                    {openseaData?.floor_price ? formatWeiToEth(openseaData.floor_price) + ` ${getCurrencySymbol(collectionData?.chain_id || 1)}` : `0.12 ${getCurrencySymbol(collectionData?.chain_id || 1)}`}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Market Cap</div>
                  <div className="font-semibold">
                    {openseaData?.market_cap ? formatMarketCap(openseaData.market_cap, collectionData?.chain_id || 1) : `12.4 ${getCurrencySymbol(collectionData?.chain_id || 1)}`}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Supply</div>
                  <div className="font-semibold">
                    {openseaData?.total_supply || collectionData?.total_supply || '3'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Listed</div>
                  <div className="font-semibold">
                    {openseaData?.total_supply ? `2 / ${openseaData.total_supply}` : '2 / 3'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Contract Balance</div>
                  <div className="font-semibold">
                    {contractBalanceLoading ? (
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 border border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
                        Loading...
                      </div>
                    ) : contractBalance !== null ? (
                      `${contractBalance.toFixed(4)} ${getCurrencySymbol(collectionData?.chain_id || 1)}`
                    ) : (
                      'N/A'
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105 ${isDarkMode
              ? 'bg-gray-800/70 border-gray-700/60'
              : 'bg-white border border-gray-200'
              }`}>
              <CardHeader className={`pb-4 transition-all duration-300 ${isDarkMode
                ? 'bg-gray-800/70'
                : 'bg-gradient-to-br from-gray-50 to-purple-50/30'
                }`}>
                <CardTitle className={`transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>Performance</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Last Sale</div>
                  <div className="font-semibold">0.19 ETH</div>
                </div>
                <div>
                  <div className="text-muted-foreground">All-time Profit</div>
                  <div className="font-semibold text-green-600 dark:text-green-400">+3.42 ETH</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total Sales</div>
                  <div className="font-semibold">27</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Floor</div>
                  <div className="font-semibold">0.12 ETH</div>
                </div>
              </CardContent>
            </Card>

            <Card className={`shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105 ${isDarkMode
              ? 'bg-gray-800/70 border-gray-700/60'
              : 'bg-white border border-gray-200'
              }`}>
              <CardHeader className={`pb-4 transition-all duration-300 ${isDarkMode
                ? 'bg-gray-800/70'
                : 'bg-gradient-to-br from-gray-50 to-purple-50/30'
                }`}>
                <CardTitle className={`transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>Contract Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className={`mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                      }`}>Token Address</div>
                    <div className="flex items-center gap-2">
                      <span className={`flex-1 truncate font-mono text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'
                        }`}>{tokenAddress}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => copy(tokenAddress)} className={`min-w-[60px] transition-all duration-300 ${isDarkMode ? 'hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-white/30 border-gray-600' : 'hover:bg-gray-100'
                          }`}>
                          Copy
                        </Button>
                        {collectionData?.explorer_base_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`${collectionData.explorer_base_url}/address/${tokenAddress}`, '_blank')}
                            className={`min-w-[60px] transition-all duration-300 ${isDarkMode ? 'hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-white/30 border-gray-600' : 'hover:bg-gray-100'
                              }`}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className={`mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                      }`}>Strategy Address</div>
                    <div className="flex items-center gap-2">
                      <span className={`flex-1 truncate font-mono text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'
                        }`}>{strategyAddress}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => copy(strategyAddress)} className={`min-w-[60px] transition-all duration-300 ${isDarkMode ? 'hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-white/30 border-gray-600' : 'hover:bg-gray-100'
                          }`}>
                          Copy
                        </Button>
                        {collectionData?.explorer_base_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`${collectionData.explorer_base_url}/address/${strategyAddress}`, '_blank')}
                            className={`min-w-[60px] transition-all duration-300 ${isDarkMode ? 'hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-white/30 border-gray-600' : 'hover:bg-gray-100'
                              }`}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className={`mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                      }`}>Collection Address</div>
                    <div className="flex items-center gap-2">
                      <span className={`flex-1 truncate font-mono text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'
                        }`}>{collectionAddress}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => copy(collectionAddress)} className={`min-w-[60px] transition-all duration-300 ${isDarkMode ? 'hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-white/30 border-gray-600' : 'hover:bg-gray-100'
                          }`}>
                          Copy
                        </Button>
                        {collectionData?.explorer_base_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`${collectionData.explorer_base_url}/address/${collectionAddress}`, '_blank')}
                            className={`min-w-[60px] transition-all duration-300 ${isDarkMode ? 'hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-white/30 border-gray-600' : 'hover:bg-gray-100'
                              }`}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {collectionData && (
                    <>
                      <div className="text-sm">
                        <div className="text-muted-foreground mb-1">Deployment Transaction</div>
                        <div className="flex items-center gap-2">
                          <span className="flex-1 truncate font-mono text-sm">{collectionData.transaction_hash}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => copy(collectionData.transaction_hash)} className={`min-w-[60px] transition-all duration-300 ${isDarkMode ? 'hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-white/30 border-gray-600' : 'hover:bg-gray-100'
                              }`}>
                              Copy
                            </Button>
                            {collectionData.explorer_base_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(`${collectionData.explorer_base_url}/tx/${collectionData.transaction_hash}`, '_blank')}
                                className={`min-w-[60px] transition-all duration-300 ${isDarkMode ? 'hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-white/30 border-gray-600' : 'hover:bg-gray-100'
                                  }`}
                              >
                                View
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                          }`}>Deployed At</div>
                        <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                          {new Date(collectionData.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                          }`}>Block Number</div>
                        <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>{collectionData.block_number.toLocaleString()}</div>
                      </div>
                    </>
                  )}
                </div>

              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="nfts" className="space-y-6">
            {nftLoading && !nftsLoaded ? (
              <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 border-purple-200 shadow-xl rounded-xl">
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-6">
                    {/* Animated NFT Icon */}
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl"></span>
                      </div>
                    </div>

                    {/* Loading Text */}
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                        Loading NFTs...
                      </h3>
                      <p className="text-sm text-gray-600">
                        Fetching collection from blockchain
                      </p>
                    </div>

                    {/* Animated Progress Dots */}
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : nftError ? (
              <Card className={`shadow-lg rounded-xl transition-colors duration-300 ${isDarkMode
                ? 'bg-gray-800/70 border-red-700/60'
                : 'bg-white border border-red-200'
                }`}>
                <CardContent className="p-6 text-center">
                  <div className="text-red-500 mb-2">??</div>
                  <h3 className={`font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>Error Loading NFTs</h3>
                  <p className={`text-sm mb-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>{nftError}</p>
                  <Button
                    onClick={() => {
                      if (collectionData?.token_address && collectionData) {
                        fetchNFTBalance(collectionData.token_address, collectionData);
                      }
                    }}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
                  >
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : nftBalance === 0 ? (
              <Card className={`shadow-lg rounded-xl transition-colors duration-300 ${isDarkMode
                ? 'bg-gray-800/70 border-gray-700/60'
                : 'bg-white border border-gray-200'
                }`}>
                <CardContent className="p-6 text-center">
                  <div className={`mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}></div>
                  <h3 className={`font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>No NFTs Found</h3>
                  <p className={`text-sm mb-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                    This collection doesn't have any NFTs yet.
                  </p>
                  <Button
                    onClick={() => {
                      if (collectionData?.token_address && collectionData) {
                        fetchNFTBalance(collectionData.token_address, collectionData);
                      }
                    }}
                    className="citrus-button"
                  >
                    Refresh
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {ownedNfts.map((nft) => {
                    // Check if this NFT is already listed in an auction (compare as strings)
                    const isListed = activeAuctions.some(auction =>
                      String(auction.tokenId) === String(nft.id)
                    );

                    // Debug logging
                    if (activeAuctions.length > 0 && nft.id === '9') {
                      console.log('NFT check for token 9:', {
                        nftId: nft.id,
                        nftIdType: typeof nft.id,
                        activeAuctions: activeAuctions.map(a => ({ id: a.tokenId, type: typeof a.tokenId })),
                        isListed
                      });
                    }

                    return (
                      <Card key={nft.id} className="bg-card/60 hover:shadow-lg transition-all duration-300 hover:scale-105">
                        <CardHeader>
                          <CardTitle className="text-base">{nft.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="h-40 rounded-lg bg-muted/30 flex items-center justify-center overflow-hidden">
                            <img
                              src={collectionData?.collection_image || img || "/placeholder.svg"}
                              alt={`${nft.name} - ${collectionData?.collection_name || slug}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to emoji if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="flex items-center justify-center text-4xl w-full h-full">??</div>';
                                }
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Token ID: {nft.id}</span>
                            {isListed ? (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200">Listed</Badge>
                            ) : nft.location === 'strategy' ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200">In Strategy</Badge>
                            ) : (
                              <Badge variant="secondary">In Wallet</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isOwner && (
                              isListed ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled
                                  className="w-full cursor-not-allowed opacity-60"
                                >
                                  Listed
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" onClick={() => handleSellClick(nft)} className="w-full">
                                  {nft.location === 'strategy' ? 'List' : 'Sell'}
                                </Button>
                              )
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="listings" className="space-y-6">
            {isOwner ? (
              <>
                {/* Load button */}
                {activeAuctions.length === 0 && !auctionsLoading && (
                  <Card className={`shadow-lg rounded-xl transition-colors duration-300 ${isDarkMode
                    ? 'bg-gray-800/70 border-gray-700/60'
                    : 'bg-white border border-gray-200'
                    }`}>
                    <CardContent className="p-6 text-center">
                      <div className={`mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}></div>
                      <h3 className={`font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>Load Active Auctions</h3>
                      <p className={`text-sm mb-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                        Click below to fetch active auction listings from the blockchain.
                      </p>
                      <Button
                        onClick={fetchActiveAuctions}
                        className="citrus-button"
                      >
                        Load Auctions
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Loading state */}
                {auctionsLoading && (
                  <Card className={`shadow-lg rounded-xl transition-colors duration-300 ${isDarkMode
                    ? 'bg-gray-800/70 border-gray-700/60'
                    : 'bg-white border border-gray-200'
                    }`}>
                    <CardContent className="p-6 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                      </div>
                      <p className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>Loading auctions...</p>
                    </CardContent>
                  </Card>
                )}

                {/* Active auctions */}
                {!auctionsLoading && activeAuctions.length > 0 && (
                  <Card className={`transition-colors duration-300 ${isDarkMode
                    ? 'bg-gray-800/70 border-gray-700/60'
                    : 'citrus-border-gradient bg-card/50'
                    }`}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className={`transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>Active Listings ({activeAuctions.length})</CardTitle>
                      <Button
                        className="citrus-button"
                        size="sm"
                        onClick={fetchActiveAuctions}
                        disabled={auctionsLoading}
                      >
                        Refresh
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {activeAuctions.map((auction) => (
                        <div key={auction.tokenId} className={`flex items-center justify-between p-3 rounded-lg transition-colors duration-300 ${isDarkMode ? 'bg-gray-700/30' : 'bg-muted/20'
                          }`}>
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded flex items-center justify-center overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-gray-600/40' : 'bg-muted/40'
                              }`}>
                              <img
                                src={collectionData?.collection_image || img || "/placeholder.svg"}
                                alt="NFT Preview"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '??';
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <div className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                                }`}>{collectionData?.collection_name} #{auction.tokenId}</div>
                              <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-muted-foreground'
                                }`}>
                                Current: {auction.currentPrice && auction.currentPrice !== '0' ? formatUnits(BigInt(auction.currentPrice), 18) : '0'} {collectionData?.token_symbol}
                              </div>
                              <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                Start: {auction.startPrice && auction.startPrice !== '0' ? formatUnits(BigInt(auction.startPrice), 18) : '0'} ? End: {auction.endPrice && auction.endPrice !== '0' ? formatUnits(BigInt(auction.endPrice), 18) : '0'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleCancelAuction(auction.tokenId)}
                              disabled={cancellingAuction === auction.tokenId}
                            >
                              {cancellingAuction === auction.tokenId ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 border border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
                                  Cancelling...
                                </div>
                              ) : (
                                'Cancel Listing'
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-white border border-gray-200 shadow-lg rounded-xl">
                <CardContent className="p-6 text-center">
                  <div className="text-gray-500 mb-2"></div>
                  <h3 className="font-semibold text-gray-800 mb-2">Access Restricted</h3>
                  <p className="text-sm text-gray-600">
                    Only the collection owner can manage listings and pricing.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="buy" className="space-y-6">
            {isOwner ? (
              <>
                {!collectionData?.opensea_slug && getMarketplace(collectionData?.chain_id) === 'opensea' ? (
                  <Card className="bg-white border border-gray-200 shadow-lg rounded-xl">
                    <CardContent className="p-6 text-center">
                      <div className="text-gray-500 mb-2"></div>
                      <h3 className="font-semibold text-gray-800 mb-2">OpenSea Not Configured</h3>
                      <p className="text-sm text-gray-600">
                        Add an OpenSea slug to enable floor price purchases.
                      </p>
                    </CardContent>
                  </Card>
                ) : loadingFloorPrice ? (
                  <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-purple-50/50 border border-purple-100/50 shadow-xl rounded-2xl">
                    <CardContent className="p-12 text-center relative z-10">
                      {/* Animated background gradient */}
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-200 rounded-full filter blur-xl animate-blob"></div>
                        <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-300 rounded-full filter blur-xl animate-blob animation-delay-2000"></div>
                        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-200 rounded-full filter blur-xl animate-blob animation-delay-4000"></div>
                      </div>

                      <div className="flex flex-col items-center justify-center gap-8 relative">
                        {/* Cool NFT card loading animation */}
                        <div className="relative">
                          {/* Rotating glow effect */}
                          <div className="absolute inset-0 bg-purple-200 rounded-2xl blur-2xl opacity-60 animate-pulse"></div>

                          {/* Main card */}
                          <div className="relative bg-gradient-to-br from-purple-400 to-purple-500 p-8 rounded-2xl transform hover:scale-105 transition-transform duration-300">
                            {/* Scanning line animation */}
                            <div className="absolute inset-0 overflow-hidden rounded-2xl">
                              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white to-transparent opacity-20 animate-scan"></div>
                            </div>

                            {/* NFT Icon */}
                            <div className="relative z-10">
                              <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 animate-float">
                                <svg className="w-12 h-12 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                              </div>

                              {/* Loading dots */}
                              <div className="flex justify-center space-x-2">
                                <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
                                <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Text content */}
                        <div className="space-y-3">
                          <h3 className="text-2xl font-bold text-gray-900 animate-pulse">
                            Scanning Floor Price
                          </h3>
                          <p className="text-gray-600 text-sm max-w-md">
                            Searching OpenSea for the best deal on this collection
                          </p>

                          {/* Progress indicators */}
                          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-4">
                            <div className="flex items-center gap-1 opacity-100 transition-opacity">
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-ping"></div>
                              <span>Connecting to OpenSea</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : buyError ? (
                  <Card className={`shadow-lg rounded-xl transition-colors duration-300 ${isDarkMode
                    ? 'bg-gray-800/70 border-red-700/60'
                    : 'bg-white border border-red-200'
                    }`}>
                    <CardContent className="p-6 text-center">
                      <div className="text-red-500 mb-2">??</div>
                      <h3 className={`font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>Error Loading Listings</h3>
                      <p className={`text-sm mb-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>{buyError}</p>
                      <Button
                        onClick={fetchFloorListing}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
                      >
                        Try Again
                      </Button>
                    </CardContent>
                  </Card>
                ) : !floorListing ? (
                  <Card className={`relative overflow-hidden shadow-xl rounded-2xl transition-colors duration-300 ${isDarkMode
                    ? 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800/50 border border-purple-700/50'
                    : 'bg-gradient-to-br from-purple-50 via-white to-purple-50/50 border border-purple-100/50'
                    }`}>
                    <CardContent className="p-12 text-center relative z-10">
                      {/* Subtle animated background */}
                      <div className="absolute inset-0 opacity-30">
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full filter blur-3xl animate-pulse transition-colors duration-300 ${isDarkMode ? 'bg-purple-600' : 'bg-purple-200'
                          }`}></div>
                      </div>

                      <div className="space-y-8 relative">
                        {/* Icon */}
                        <div className="flex justify-center">
                          <div className="relative">
                            <div className={`absolute inset-0 rounded-2xl blur-xl opacity-60 transition-colors duration-300 ${isDarkMode ? 'bg-purple-600' : 'bg-purple-200'
                              }`}></div>
                            <div className="relative bg-gradient-to-br from-purple-400 to-purple-500 p-8 rounded-2xl">
                              <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Text */}
                        <div className="space-y-4 max-w-lg mx-auto">
                          <h3 className={`text-3xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                            Buy NFTs at Floor Price
                          </h3>
                          <p className={`text-base leading-relaxed transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                            Instantly purchase the cheapest available NFT from this collection on {getMarketplace(collectionData?.chain_id) === 'magiceden' ? 'Magic Eden' : getMarketplace(collectionData?.chain_id) === 'okidori' ? 'Okidori' : 'OpenSea'}. Click below to scan for the best deal.
                          </p>
                        </div>

                        {/* CTA Button */}
                        <Button
                          onClick={fetchFloorListing}
                          className="citrus-button px-10 py-6 text-lg font-semibold"
                        >
                          <span className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Load Floor Price
                          </span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {/* Header with refresh button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">Floor Price NFT</h3>
                          <p className="text-sm text-gray-500">Best deal on {floorListing.marketplace === 'magiceden' || getMarketplace(collectionData?.chain_id) === 'magiceden' ? 'Magic Eden' : floorListing.marketplace === 'okidori' || getMarketplace(collectionData?.chain_id) === 'okidori' ? 'Okidori' : 'OpenSea'}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchFloorListing}
                        disabled={loadingFloorPrice}
                        className="border-purple-200 hover:bg-purple-50"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                      </Button>
                    </div>

                    {/* Main NFT Card */}
                    <Card className="relative overflow-hidden bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 border-2 border-purple-200/50 shadow-2xl rounded-2xl">
                      {/* Decorative gradient background */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>

                      <CardContent className="p-8 relative z-10">
                        {/* NFT Preview Section */}
                        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-8">
                          {/* NFT Image */}
                          <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                            <div className="relative w-48 h-48 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 overflow-hidden border-4 border-white shadow-2xl">
                              <img
                                src={collectionData?.collection_image || img || "/placeholder.svg"}
                                alt="NFT Preview"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<div class="flex items-center justify-center w-full h-full text-6xl"></div>';
                                  }
                                }}
                              />
                            </div>
                            {/* Badge */}
                            <div className="absolute -top-2 -right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                              FLOOR
                            </div>
                          </div>

                          {/* NFT Details */}
                          <div className="flex-1 space-y-4">
                            <div>
                              <h4 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                {collectionData?.collection_name} #{floorListing.tokenId}
                              </h4>
                              <div className="flex flex-wrap gap-2 mt-3">
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                                  Token ID: {floorListing.tokenId}
                                </span>
                                <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                                  {floorListing.nftContractAddress.slice(0, 6)}...{floorListing.nftContractAddress.slice(-4)}
                                </span>
                              </div>
                            </div>

                            {/* Price Display - Large and prominent */}
                            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-2xl text-white shadow-xl">
                              <div className="text-sm font-medium opacity-90 mb-1">Floor Price</div>
                              <div className="text-4xl font-bold flex items-baseline gap-2">
                                {formatUnits(floorListing.priceWei, 18)}
                                <span className="text-2xl opacity-90">{floorListing.currency}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div className="bg-white/80 backdrop-blur-sm p-5 rounded-xl border border-purple-100 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="text-sm text-gray-500 font-medium">Contract Balance</div>
                                <div className="text-xl font-bold text-gray-900">
                                  {contractBalance !== null ? `${contractBalance.toFixed(4)} ${getCurrencySymbol(collectionData?.chain_id)}` : 'Loading...'}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white/80 backdrop-blur-sm p-5 rounded-xl border border-purple-100 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-purple-100 rounded-lg">
                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="text-sm text-gray-500 font-medium">Network</div>
                                <div className="text-xl font-bold text-gray-900">
                                  {collectionData?.network_name || 'Unknown'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Listing Expiration */}
                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200/50 rounded-xl p-4 mb-6">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-yellow-900 mb-1">Listing Expires</div>
                              <div className="text-sm text-yellow-700">
                                {floorListing.marketplace === 'magiceden' || floorListing.marketplace === 'okidori'
                                  ? new Date(Number(floorListing.validUntil) * 1000).toLocaleString()
                                  : new Date(Number(floorListing.protocol_data.parameters.endTime) * 1000).toLocaleString()
                                }
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Buy Button */}
                        <Button
                          onClick={() => {
                            console.log(' Buy button onClick fired');
                            console.log('Button state:', {
                              buyingNFT,
                              isConnected,
                              contractBalance,
                              floorPriceWei: floorListing.priceWei.toString(),
                              balanceWei: contractBalance ? BigInt(Math.floor(contractBalance * 1e18)).toString() : 'null',
                              hasEnoughBalance: contractBalance !== null && BigInt(Math.floor(contractBalance * 1e18)) >= floorListing.priceWei
                            });
                            handleBuyFloorNFT();
                          }}
                          disabled={buyingNFT || !isConnected || contractBalance === null || (contractBalance !== null && BigInt(Math.floor(contractBalance * 1e18)) < floorListing.priceWei)}
                          className="w-full relative group text-white py-8 text-xl font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl"
                          style={{ backgroundColor: '#651bcf' }}
                        >
                          {buyingNFT ? (
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                              <span>Purchasing NFT...</span>
                            </div>
                          ) : !isConnected ? (
                            <div className="flex items-center justify-center gap-2">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              Connect Wallet to Buy
                            </div>
                          ) : contractBalance !== null && BigInt(Math.floor(contractBalance * 1e18)) < floorListing.priceWei ? (
                            <div className="flex items-center justify-center gap-2">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              Insufficient Contract Balance
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-3">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Buy NFT for {formatUnits(floorListing.priceWei, 18)} {floorListing.currency}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity"></div>
                        </Button>

                        {/* Info */}
                        <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200/50 rounded-xl p-6">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-blue-900 mb-3">How it works</h4>
                              <ul className="space-y-2 text-sm text-blue-800">
                                <li className="flex items-start gap-2">
                                  <svg className="w-4 h-4 mt-0.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Purchase made using contract's balance
                                </li>
                                <li className="flex items-start gap-2">
                                  <svg className="w-4 h-4 mt-0.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  NFT owned by payment contract
                                </li>
                                <li className="flex items-start gap-2">
                                  <svg className="w-4 h-4 mt-0.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Powered by OpenSea Seaport protocol
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            ) : (
              <Card className="bg-white border border-gray-200 shadow-lg rounded-xl">
                <CardContent className="p-6 text-center">
                  <div className="text-gray-500 mb-2"></div>
                  <h3 className="font-semibold text-gray-800 mb-2">Owner Only</h3>
                  <p className="text-sm text-gray-600">
                    Only the collection owner can purchase NFTs on floor price.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {isOwner ? (
              <>
                {/* Profile Management */}
                <Card className={`shadow-xl rounded-2xl transition-colors duration-300 ${isDarkMode
                  ? 'bg-gray-800/70 border-gray-700/60'
                  : 'bg-white border border-gray-200'
                  }`}>
                  <CardHeader className={`pb-4 transition-all duration-300 ${isDarkMode
                    ? 'bg-gray-800/70'
                    : 'bg-gradient-to-br from-gray-50 to-purple-50/30'
                    }`}>
                    <CardTitle className={`transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>Collection Profile</CardTitle>
                    <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                      Update your collection's profile information and social links.
                    </p>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Collection Image */}
                      <div className="space-y-3">
                        <Label htmlFor="collectionImage">Collection Image</Label>
                        <div className="flex items-center space-x-4">
                          <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                            {(() => {
                              console.log('Preview render - imagePreview:', imagePreview ? 'Has value' : 'Empty', 'Length:', imagePreview?.length);
                              console.log('Preview render - profileData.collection_image:', profileData.collection_image ? 'Has value' : 'Empty');

                              if (imagePreview && imagePreview.length > 0) {
                                return (
                                  <img
                                    src={imagePreview}
                                    alt="Collection Preview"
                                    className="w-full h-full object-cover"
                                  />
                                );
                              } else if (profileData.collection_image) {
                                return (
                                  <img
                                    src={`data:image/jpeg;base64,${profileData.collection_image}`}
                                    alt="Collection"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = '<div class="flex items-center justify-center w-full h-full text-gray-400 text-xs">No Image</div>';
                                      }
                                    }}
                                  />
                                );
                              } else {
                                return (
                                  <div className="flex items-center justify-center w-full h-full text-gray-400 text-xs">
                                    No Image
                                  </div>
                                );
                              }
                            })()}
                          </div>
                          <div className="flex-1">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Input
                                  id="collectionImage"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                  className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                />
                              </div>
                              <p className="text-xs text-gray-500">
                                Upload a new collection image (PNG, JPG, GIF - Max 5MB)
                              </p>
                              {imageFile && (
                                <div className="text-xs text-green-600 font-medium flex items-center space-x-1">
                                  <span>?</span>
                                  <span>{imageFile.name} selected</span>
                                  <span className="text-gray-500">({(imageFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Website */}
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          type="url"
                          placeholder="https://yourwebsite.com"
                          value={profileData.website}
                          onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                          className="text-sm"
                        />
                      </div>

                      {/* OpenSea */}
                      <div className="space-y-2">
                        <Label htmlFor="opensea">OpenSea Collection</Label>
                        <Input
                          id="opensea"
                          type="text"
                          placeholder="your-collection-name"
                          value={profileData.opensea_slug}
                          onChange={(e) => setProfileData(prev => ({ ...prev, opensea_slug: e.target.value }))}
                          className="text-sm"
                        />
                        <p className="text-xs text-gray-500">
                          Your OpenSea collection slug (without the full URL)
                        </p>
                      </div>

                      {/* X (Twitter) */}
                      <div className="space-y-2">
                        <Label htmlFor="twitter">X (Twitter)</Label>
                        <Input
                          id="twitter"
                          type="text"
                          placeholder="@yourusername"
                          value={profileData.twitter}
                          onChange={(e) => setProfileData(prev => ({ ...prev, twitter: e.target.value }))}
                          className="text-sm"
                        />
                      </div>

                      {/* Discord */}
                      <div className="space-y-2">
                        <Label htmlFor="discord">Discord</Label>
                        <Input
                          id="discord"
                          type="url"
                          placeholder="https://discord.gg/yourinvite"
                          value={profileData.discord}
                          onChange={(e) => setProfileData(prev => ({ ...prev, discord: e.target.value }))}
                          className="text-sm"
                        />
                      </div>

                      {/* Telegram */}
                      <div className="space-y-2">
                        <Label htmlFor="telegram">Telegram</Label>
                        <Input
                          id="telegram"
                          type="text"
                          placeholder="@yourusername or https://t.me/yourusername"
                          value={profileData.telegram_id}
                          onChange={(e) => setProfileData(prev => ({ ...prev, telegram_id: e.target.value }))}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Reset to current values
                          if (collectionData) {
                            setProfileData({
                              collection_image: collectionData.collection_image || '',
                              website: collectionData.website || '',
                              opensea_slug: collectionData.opensea_slug || '',
                              twitter: collectionData.twitter || '',
                              discord: collectionData.discord || '',
                              telegram_id: collectionData.telegram_id || ''
                            });
                          }
                          // Clear file upload
                          setImageFile(null);
                          setImagePreview('');
                        }}
                      >
                        Reset
                      </Button>
                      <Button
                        className="citrus-button"
                        onClick={handleUpdateProfile}
                        disabled={profileLoading}
                      >
                        {profileLoading ? (
                          <>
                            <Spinner className="h-4 w-4 mr-2" />
                            Updating...
                          </>
                        ) : (
                          'Update Profile'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Rewards Management */}
                <Card className={`transition-colors duration-300 ${isDarkMode
                  ? 'bg-gray-800/70 border-gray-700/60'
                  : 'citrus-border-gradient bg-card/50'
                  }`}>
                  <CardHeader>
                    <CardTitle className={`transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>Rewards Management</CardTitle>
                    <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-muted-foreground'
                      }`}>
                      Configure reward percentages for external callers who execute transactions on your token.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {rewardLoading && (
                      <div className="flex items-center justify-center py-4">
                        <Spinner className="h-6 w-6" />
                        <span className="ml-2">Loading reward settings...</span>
                      </div>
                    )}

                    {rewardError && (
                      <div className={`p-4 rounded-lg transition-colors duration-300 ${isDarkMode
                        ? 'bg-red-900/30 border border-red-700/60'
                        : 'bg-red-50 border border-red-200'
                        }`}>
                        <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-red-400' : 'text-red-600'
                          }`}>{rewardError}</p>
                      </div>
                    )}

                    {!rewardLoading && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="rewardPercentage">Reward Percentage (Basis Points)</Label>
                            <Input
                              id="rewardPercentage"
                              type="number"
                              value={rewardPercentage}
                              onChange={(e) => setRewardPercentage(e.target.value)}
                              placeholder="200"
                              className="font-mono"
                            />
                            <div className="text-xs text-muted-foreground">
                              {rewardPercentage ? `${(Number(rewardPercentage) / 100).toFixed(2)}%` : '0%'} ?
                              Max: Not available
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Current Settings</Label>
                            <div className={`p-3 rounded-lg transition-colors duration-300 ${isDarkMode ? 'bg-gray-700/50' : 'bg-muted'
                              }`}>
                              <div className="text-sm">
                                <div className="flex justify-between">
                                  <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                    }`}>Current Reward:</span>
                                  <span className={`font-mono transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'
                                    }`}>
                                    {currentRewardPercentage ? `${currentRewardPercentage} bp (${currentRewardPercentage / 100}%)` : 'Loading...'}
                                  </span>
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                    }`}>Max Allowed:</span>
                                  <span className={`font-mono transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'
                                    }`}>
                                    Not available
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>


                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setRewardPercentage(currentRewardPercentage?.toString() || "200");
                              setRewardError(null);
                            }}
                          >
                            Reset
                          </Button>
                          <Button
                            className="citrus-button"
                            onClick={handleUpdateRewardPercentage}
                            disabled={rewardLoading || !rewardPercentage || rewardPercentage === currentRewardPercentage?.toString()}
                          >
                            {rewardLoading ? (
                              <>
                                <Spinner className="h-4 w-4 mr-2" />
                                Updating...
                              </>
                            ) : (
                              'Update Rewards'
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="bg-white border border-gray-200 shadow-lg rounded-xl">
                <CardContent className="p-6 text-center">
                  <div className="text-gray-500 mb-2"></div>
                  <h3 className="font-semibold text-gray-800 mb-2">Access Restricted</h3>
                  <p className="text-sm text-gray-600">
                    Only the collection owner can modify reward settings and collection configuration.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Sell Modal */}
        <Dialog open={sellModalOpen} onOpenChange={setSellModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {sellStep === 'transfer' ? 'Transfer NFT to Listing' : 'List NFT for Auction'}
              </DialogTitle>
              <DialogDescription>
                {sellStep === 'transfer'
                  ? 'Transfer your NFT to the strategy contract to prepare for listing.'
                  : 'Set your auction prices to list your NFT.'}
              </DialogDescription>
            </DialogHeader>

            {selectedNft && (
              <div className="space-y-4">
                {/* NFT Preview */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center overflow-hidden">
                    <img
                      src={collectionData?.collection_image || img || "/placeholder.svg"}
                      alt={selectedNft.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '';
                        }
                      }}
                    />
                  </div>
                  <div>
                    <div className="font-semibold">{selectedNft.name}</div>
                    <div className="text-sm text-gray-500">Token ID: {selectedNft.id}</div>
                  </div>
                </div>

                {/* Error Message */}
                {sellError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{sellError}</p>
                  </div>
                )}

                {/* Checking Ownership State */}
                {checkingOwnership && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600">Checking NFT ownership...</p>
                  </div>
                )}

                {/* Step 1: Transfer */}
                {!checkingOwnership && sellStep === 'transfer' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Step 1: Transfer to Strategy</h4>
                      <p className="text-sm text-blue-700">
                        Your NFT will be transferred to the strategy contract to enable listing.
                        This is required before you can list it for auction.
                      </p>
                    </div>

                    <Button
                      onClick={handleTransferToStrategy}
                      disabled={transferring}
                      className="w-full text-white"
                      style={{ backgroundColor: '#651bcf' }}
                    >
                      {transferring ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Transferring...
                        </div>
                      ) : (
                        'Approve Transfer'
                      )}
                    </Button>
                  </div>
                )}

                {/* Step 2: Auction */}
                {!checkingOwnership && sellStep === 'auction' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">? NFT Ready for Listing</h4>
                      <p className="text-sm text-green-700">
                        Your NFT is in the strategy contract. Set your auction prices below to list it.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="startPrice">Start Price ({collectionData?.token_symbol || 'Tokens'})</Label>
                        <Input
                          id="startPrice"
                          type="number"
                          step="0.01"
                          placeholder="0.11"
                          value={startPrice}
                          onChange={(e) => setStartPrice(e.target.value)}
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">Initial auction price in {collectionData?.token_symbol || 'tokens'}</p>
                      </div>

                      <div>
                        <Label htmlFor="endPrice">End Price ({collectionData?.token_symbol || 'Tokens'})</Label>
                        <Input
                          id="endPrice"
                          type="number"
                          step="0.01"
                          placeholder="0.10"
                          value={endPrice}
                          onChange={(e) => setEndPrice(e.target.value)}
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">Final auction price (must be lower than start)</p>
                      </div>
                    </div>

                    <Button
                      onClick={handleStartAuction}
                      disabled={listing || !startPrice || !endPrice}
                      className="w-full text-white"
                      style={{ backgroundColor: '#651bcf' }}
                    >
                      {listing ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Creating Auction...
                        </div>
                      ) : (
                        'List for Auction'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* No Listings Found Modal */}
        <Dialog open={noListingsModalOpen} onOpenChange={setNoListingsModalOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-center">No Listings Found</DialogTitle>
              <DialogDescription className="text-center">
                We couldn't find any active listings for this collection.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="text-6xl"></div>
              <div className="text-center space-y-2">
                <h3 className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>No Active Listings</h3>
                <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                  This collection doesn't have any NFTs currently listed for sale on the marketplace.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={() => setNoListingsModalOpen(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setNoListingsModalOpen(false);
                    fetchFloorListing();
                  }}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
      <BidBopFooter />
    </div>
  )
}
