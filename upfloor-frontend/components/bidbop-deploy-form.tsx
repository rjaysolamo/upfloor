"use client"

import type React from "react"
import { useMemo, useRef, useState, useEffect, useCallback } from "react"
import { createPublicClient, http } from "viem"
import { getChainConfig, getRpcUrl } from "@/lib/chainlist"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useSafeAccount } from "@/hooks/use-safe-wagmi"
import { CheckCircle, Copy, ExternalLink, AlertCircle, Zap, AlertTriangle, Loader2 } from "lucide-react"
import ClientOnly from "@/components/client-only"
import { useRouter } from "next/navigation"
import { getExplorerUrl } from "@/lib/chainlist"
import { useTheme } from "@/components/theme-provider"

type FormState = {
  name: string
  symbol: string
  collection: string
  royaltyPercentage: string
  royaltyRecipient: string
  website?: string
  twitter?: string
  discord?: string
  telegram?: string
  opensea?: string
  image?: string
}

const isEthAddress = (v: string) => /^0x[a-fA-F0-9]{40}$/.test(v.trim())

// Factory ABI
const factoryAbi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "InsufficientDeploymentFee",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidDeploymentFee",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidInput",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "deployer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "router",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "strategy",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "deploymentFee",
        "type": "uint256"
      }
    ],
    "name": "TokenDeployed",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_symbol",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "_nftCollection",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_collectionOwnerAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_royaltyRecipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_royaltyBps",
        "type": "uint256"
      }
    ],
    "name": "deployStrategyToken",
    "outputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "router",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "strategy",
        "type": "address"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDeploymentFee",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "HYPE_DEPLOYMENT_FEE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "APE_DEPLOYMENT_FEE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ETH_DEPLOYMENT_FEE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PROTOCOL_FEE_RECIPIENT",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUserTokens",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Factory addresses for different chains
const FACTORY_ADDRESSES = {
  33139: "0x2fC63b3F35F5738BeE40727cd0697177Af7E78a0", // Apechain Mainnet
  10143: "0xf0945Db3648b01F423444980C0e9180A6CF13352", // Monad Testnet
  999: "0x3f5a6dfd97d6e5d8ef2ea6dd242d94ae5fde1e6d", // hyper evm mainnet
  167000: "0xbE610B40FDDe8e7f48388234A6b48cAFbeEf7d2C", // Taiko Alethia
  42161: "0xa04da54ce66485F96319eD81a0C81f471d241Fdd", // Arbitrum One
  8453: "0xB16EAa34cA11291a70Acfc16440F3aABAf89E332", // Base
  10: "0xB16EAa34cA11291a70Acfc16440F3aABAf89E332", // Optimism
  11155111: "0xB16EAa34cA11291a70Acfc16440F3aABAf89E332", // Sepolia ETH
  143: "0x5EE7b8e36636EABF89513b1E456E0E36cC296f5E"
} as const;

// Helper function to format wei to ETH
const formatWeiToEth = (wei: string) => {
  const weiBigInt = BigInt(wei)
  const ethBigInt = weiBigInt / BigInt(10 ** 18)
  const remainderBigInt = weiBigInt % BigInt(10 ** 18)

  // Convert remainder to decimal string with proper padding
  const remainderStr = remainderBigInt.toString().padStart(18, '0')
  const decimalPart = remainderStr.slice(0, 6) // Take first 6 decimal places

  // Remove trailing zeros
  const trimmedDecimal = decimalPart.replace(/0+$/, '')

  if (trimmedDecimal === '') {
    return `${ethBigInt}.0`
  }

  return `${ethBigInt}.${trimmedDecimal}`
}

// Function to fetch deployment fee using viem
const fetchDeploymentFee = async (chainId: number): Promise<string | null> => {
  try {
    // Get factory address
    const factoryAddress = FACTORY_ADDRESSES[chainId as keyof typeof FACTORY_ADDRESSES];
    if (!factoryAddress) {
      console.error(`Unsupported chain ID: ${chainId}`);
      return null;
    }

    // Get RPC URL
    const rpcUrl = getRpcUrl(chainId);
    if (!rpcUrl) {
      console.error(`No RPC URL configured for chain ID: ${chainId}`);
      return null;
    }

    // Create public client
    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    });

    // Use chain-specific deployment fee functions
    let functionName = "ETH_DEPLOYMENT_FEE"; // Default to ETH fee
    if (chainId === 999) {
      functionName = "HYPE_DEPLOYMENT_FEE";
    } else if (chainId === 33139 || chainId === 143) {
      functionName = "APE_DEPLOYMENT_FEE";
    } else if (chainId === 10143) {
      functionName = "getDeploymentFee"; // Monad uses generic function
    }
    // All other chains (including Taiko 167000) use ETH_DEPLOYMENT_FEE

    // Call deployment fee function
    const deploymentFee = await publicClient.readContract({
      address: factoryAddress as `0x${string}`,
      abi: factoryAbi,
      functionName: functionName as any,
    });

    return deploymentFee.toString();
  } catch (error) {
    console.error('Error fetching deployment fee:', error);
    return null;
  }
};

// Custom debounce hook for better performance
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Helper function to get explorer URL for a specific chain and hash
function getExplorerLink(chainId: string | number | undefined, type: 'tx' | 'address', hash: string) {
  if (!chainId) return `https://etherscan.io/${type}/${hash}`;
  const chainIdNum = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId;
  return getExplorerUrl(chainIdNum, type, hash) || `https://etherscan.io/${type}/${hash}`;
}

type SymbolCheckResult = {
  symbol: string
  isAvailable: boolean
  existingTokens: Array<{
    symbol: string
    name: string
    chainId: number
    networkName: string
    createdAt: string
  }>
  message: string
}

export default function BidBopDeployForm() {
  const { address, chainId, isConnected } = useSafeAccount()
  const { isDarkMode } = useTheme()
  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ""
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    name: "",
    symbol: "",
    collection: "",
    royaltyPercentage: "3.0", // Default to 3%
    royaltyRecipient: "",
    website: "",
    twitter: "",
    discord: "",
    telegram: "",
    opensea: "",
    image: "",
  })

  // Symbol validation state
  const [symbolCheck, setSymbolCheck] = useState<SymbolCheckResult | null>(null)
  const [checkingSymbol, setCheckingSymbol] = useState(false)
  const [symbolError, setSymbolError] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)

  // Debounced symbol for validation (300ms delay for faster feedback)
  const debouncedSymbol = useDebounce(form.symbol, 300)

  const [errors, setErrors] = useState<Record<keyof FormState, string | undefined>>({
    name: undefined,
    symbol: undefined,
    collection: undefined,
    royaltyPercentage: undefined,
    royaltyRecipient: undefined,
    website: undefined,
    twitter: undefined,
    discord: undefined,
    telegram: undefined,
    opensea: undefined,
    image: undefined,
  })

  // Real-time symbol validation with improved UX
  const checkSymbolAvailability = useCallback(async (symbol: string) => {
    if (!symbol || !symbol.trim()) {
      setSymbolCheck(null)
      setSymbolError(null)
      setIsTyping(false)
      return
    }

    try {
      setCheckingSymbol(true)
      setSymbolError(null)
      setIsTyping(false)

      const response = await fetch(`/api/check-symbol?symbol=${encodeURIComponent(symbol)}&chainId=${chainId}`)
      const result = await response.json()

      if (result.success) {
        setSymbolCheck(result)
      } else {
        setSymbolError(result.error || "Failed to check symbol availability")
      }
    } catch (error) {
      console.error("Error checking symbol:", error)
      setSymbolError("Failed to check symbol availability")
    } finally {
      setCheckingSymbol(false)
    }
  }, [chainId])

  // Check symbol when debounced value changes
  useEffect(() => {
    checkSymbolAvailability(debouncedSymbol)
  }, [debouncedSymbol, checkSymbolAvailability])

  // Track typing state
  useEffect(() => {
    if (form.symbol && form.symbol.trim()) {
      setIsTyping(true)
      // Clear typing state after debounce period
      const timer = setTimeout(() => setIsTyping(false), 300)
      return () => clearTimeout(timer)
    } else {
      setIsTyping(false)
    }
  }, [form.symbol])

  // Fetch deployment fee when chain changes
  useEffect(() => {
    if (chainId && isConnected) {
      setLoadingFee(true)
      setDeploymentFee(undefined) // Clear previous fee

      fetchDeploymentFee(chainId)
        .then(fee => {
          if (fee) {
            setDeploymentFee(fee)
          }
        })
        .catch(err => {
          console.error('Failed to fetch deployment fee:', err)
        })
        .finally(() => {
          setLoadingFee(false)
        })
    } else {
      // Clear fee when disconnected or no chain
      setDeploymentFee(undefined)
      setLoadingFee(false)
    }
  }, [chainId, isConnected])

  const [submitting, setSubmitting] = useState(false)
  const [txHash, setTxHash] = useState<string | undefined>()
  const [deployError, setDeployError] = useState<string | undefined>()
  const [contractAddress, setContractAddress] = useState<string | undefined>()
  const [copied, setCopied] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [deploymentFee, setDeploymentFee] = useState<string | undefined>()
  const [loadingFee, setLoadingFee] = useState(false)
  const sectionRef = useRef<HTMLElement | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const completed =
    (form.name.trim() ? 1 : 0) +
    (form.symbol.trim() ? 1 : 0) +
    (isEthAddress(form.collection) ? 1 : 0) +
    (isEthAddress(form.royaltyRecipient) ? 1 : 0) +
    (form.twitter?.trim() || form.website?.trim() ? 1 : 0)
  const progressPct = Math.round((completed / 5) * 100)

  const onChange = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value
    if (key === "symbol") {
      v = v
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 10)
    }
    setForm((f) => ({ ...f, [key]: v }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, image: 'Only JPEG, PNG, GIF, and WebP images are supported' }))
      return
    }

    // Validate file size (500KB limit)
    const maxSize = 500 * 1024 // 500KB
    if (file.size > maxSize) {
      setErrors(prev => ({
        ...prev,
        image: `Image size exceeds 500KB limit. Current size: ${Math.round(file.size / 1024)}KB`
      }))
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setForm(prev => ({ ...prev, image: base64 }))
      setErrors(prev => ({ ...prev, image: undefined }))
    }
    reader.readAsDataURL(file)
  }

  const connected = !!address

  const isValid = useMemo(() => {
    const e: typeof errors = {
      name: undefined,
      symbol: undefined,
      collection: undefined,
      royaltyPercentage: undefined,
      royaltyRecipient: undefined,
      website: undefined,
      twitter: undefined,
      discord: undefined,
      telegram: undefined,
      opensea: undefined,
      image: undefined
    }
    if (!form.name.trim()) e.name = "Token name is required"
    if (!form.symbol.trim()) e.symbol = "Symbol is required"
    if (form.symbol.trim().length > 10) e.symbol = "Max 10 characters"
    if (!isEthAddress(form.collection)) e.collection = "Enter a valid Ethereum address"
    if (!isEthAddress(form.royaltyRecipient)) e.royaltyRecipient = "Enter a valid Ethereum address"

    // Validate royalty percentage
    const royaltyPercentage = parseFloat(form.royaltyPercentage)
    if (!form.royaltyPercentage.trim()) {
      e.royaltyPercentage = "Royalty percentage is required"
    } else if (isNaN(royaltyPercentage)) {
      e.royaltyPercentage = "Enter a valid number"
    } else if (royaltyPercentage < 0 || royaltyPercentage > 100) {
      e.royaltyPercentage = "Must be between 0 and 100"
    }
    setErrors(e)
    const socialsOk = Boolean((form.twitter || form.website || form.telegram || form.opensea || "").trim())
    const symbolOk = symbolCheck ? symbolCheck.isAvailable : true // Allow if not checked yet
    return Object.values(e).every((v) => !v) && socialsOk && symbolOk
  }, [form, symbolCheck])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!connected) return
    if (!isValid) return
    setSubmitting(true)
    setDeployError(undefined)
    setTxHash(undefined)
    setContractAddress(undefined)

    try {
      // 1. Get deployment fee first using viem
      if (!chainId) {
        throw new Error('Chain ID not available')
      }
      const deploymentFee = await fetchDeploymentFee(chainId)
      if (!deploymentFee) {
        throw new Error('Failed to get deployment fee')
      }

      // 2. Prepare transaction data from API
      const res = await fetch('/api/deploy-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenName: form.name,
          tokenSymbol: form.symbol,
          nftCollection: form.collection,
          collectionOwner: address, // This should be the connected wallet
          chainId: chainId, // Include chain ID to select correct factory
          royaltyPercentage: form.royaltyPercentage,
          royaltyRecipient: form.royaltyRecipient,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to prepare transaction')
      }

      const { to, data } = await res.json()

      // 3. Convert deployment fee to hex (wei)
      const deploymentFeeWei = BigInt(deploymentFee).toString(16)
      const value = `0x${deploymentFeeWei}`

      // 4. Ask wallet to send the transaction with deployment fee
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: address,
            to,
            data,
            value: value,
          },
        ],
      })

      setTxHash(txHash)

      // 5. Parse the transaction receipt to get contract details
      const parseRes = await fetch('/api/parse-deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash,
          chainId: chainId,
        }),
      })

      if (!parseRes.ok) {
        const errorData = await parseRes.json()
        throw new Error(errorData.error || 'Failed to parse deployment')
      }

      const { deployment } = await parseRes.json()
      setContractAddress(deployment.token)

      // 6. Save deployment data to database
      const saveRes = await fetch('/api/save-deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Deployment data from parsing
          deployer: deployment.deployer,
          token: deployment.token,
          router: deployment.router,
          strategy: deployment.strategy,
          name: deployment.name,
          symbol: deployment.symbol,
          txHash: deployment.txHash,
          chainId: deployment.chainId,
          blockNumber: deployment.blockNumber,

          // Form data
          collectionOwner: form.collection,
          royaltiesAddress: form.royaltyRecipient,
          royaltyPercentage: form.royaltyPercentage,
          website: form.website,
          twitter: form.twitter,
          discord: form.discord,
          telegramId: form.telegram,
          openseaSlug: form.opensea,
          image: form.image,
        }),
      })

      if (!saveRes.ok) {
        console.warn('Failed to save deployment to database:', await saveRes.text())
        // Don't throw error here as the deployment was successful
      }

    } catch (err: any) {
      setDeployError(err?.message || "Deployment failed")
    } finally {
      setSubmitting(false)
    }
  }

  function copy(text: string, type: string) {
    navigator.clipboard?.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const slugFromSymbol = (s: string) =>
    (s || "token")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")

  // If deployment is successful, show only the success page
  if (txHash) {
    return (
      <section ref={sectionRef} id="deploy" className="mx-auto max-w-6xl px-4 pb-20">
        <div className="mt-8 space-y-6">
          {/* Success Header */}
          <div className="text-center p-6 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <CheckCircle className="h-6 w-6 text-purple-600" />
              <span className="text-xl font-bold text-purple-600">Deployment Successful!</span>
            </div>
            <p className="text-sm text-gray-600">Your strategy token has been deployed successfully!</p>
          </div>

          {/* Contract Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white border border-gray-200 shadow-lg rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg text-gray-800">
                  Contract Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Token Information</Label>
                  <div className="p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100">
                    <div className="space-y-1">
                      <div className="font-semibold text-gray-800">{form.name}</div>
                      <div className="text-sm text-gray-600">
                        Symbol: <span className="font-mono font-medium text-purple-600">{form.symbol}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Transaction Hash</Label>
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
                    <a
                      className="truncate text-sm font-mono text-foreground hover:text-purple-600 transition-colors"
                      href={getExplorerLink(chainId, 'tx', txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={txHash ? String(txHash) : undefined}
                    >
                      <span className="truncate block max-w-[160px]">{txHash}</span>
                    </a>
                    <div className="flex items-center space-x-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copy(txHash, "tx")}>
                        {copied === "tx" ? (
                          <CheckCircle className="h-3 w-3 text-pink-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => window.open(getExplorerLink(chainId, 'tx', txHash), "_blank")}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Strategy Token Address</Label>
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
                    <span className="truncate text-sm font-mono text-foreground">
                      {contractAddress || "Deploying..."}
                    </span>
                    {contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000" && (
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => copy(contractAddress, "contract")}
                        >
                          {copied === "contract" ? (
                            <CheckCircle className="h-3 w-3 text-pink-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => window.open(getExplorerLink(chainId, 'address', contractAddress), "_blank")}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-lg rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg text-gray-800">
                  Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                    <p>Configure your token parameters and strategies</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                    <p>Set up solver payment and initial liquidity</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                    <p>Monitor performance and analytics</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                    <p>Update your documentation and social links</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded-lg">
                  Next: Configure solver payment and manage your collection
                </div>
                <div className="flex space-x-2">
                  <Button asChild className="flex-1 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 border border-purple-200 hover:border-purple-300">
                    <a href={`/collections/${slugFromSymbol(form.symbol)}`}>Manage Collection</a>
                  </Button>
                  <Button asChild variant="outline" className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300">
                    <a href="/creator-dashboard">View All Collections</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section ref={sectionRef} id="deploy" className="mx-auto max-w-5xl px-4 sm:px-6 pb-16">
      <Card className={`border shadow-lg rounded-2xl transition-colors duration-300 ${isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
        }`}>
        <CardHeader className="text-center pb-3 pt-4">
          <CardTitle className={`text-xl flex items-center justify-center space-x-2 mb-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
            <span>Token Deployment</span>
          </CardTitle>
          <div className="mx-auto max-w-lg">
            <div className={`h-1.5 w-full rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
              }`}>
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-[width] duration-300"
                style={{ width: `${progressPct}%` }}
                aria-label="Form completion progress"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                role="progressbar"
              />
            </div>
            <div className={`mt-1 text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
              Step {step} of 3 • {progressPct}%
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Deployment Form */}
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* RIGHT: Live Preview */}
            <div className="order-first lg:order-last">
              <Card className={`border shadow-sm rounded-xl transition-colors duration-300 ${isDarkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
                }`}>
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>Live Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-3">
                  {/* Token Info */}
                  <div className="flex items-center gap-2">
                    {form.image ? (
                      <img src={form.image} alt="Collection preview" className="h-10 w-10 rounded-lg object-cover border border-gray-200" />
                    ) : (
                      <img
                        src="/brand/purplet.png"
                        alt="UpFloor.co mascot"
                        className="h-10 w-auto rounded-lg"
                      />
                    )}
                    <div>
                      <div className={`font-semibold text-sm transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>{form.name || "Your Token Name"}</div>
                      <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                        }`}>
                        Symbol: <span className="font-mono font-medium text-purple-600">{form.symbol || "BOPX"}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`rounded-lg p-2 text-xs transition-colors duration-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>Network</span>
                      <span className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>Detected: {chainId ? `${getChainConfig(chainId)?.name || "Unknown"}(${chainId})` : "Unknown"}</span>
                    </div>

                  </div>
                  <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                    }`}>
                    Review details then deploy. View tx on Etherscan after success.
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* LEFT: Step-based fields */}
            <div className="space-y-4">
              {step === 1 && (
                <div className="space-y-6" aria-label="Step 1: Basics">
                  <div className="space-y-2">
                    <Label htmlFor="name" className={`text-sm font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                      Token Name
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g., BidBop Explorer Fund"
                      value={form.name}
                      onChange={onChange("name")}
                      disabled={!connected || submitting}
                      className={`transition-colors duration-300 ${isDarkMode
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-purple-400'
                        : 'border-gray-200 focus:border-purple-400'
                        }`}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>{errors.name}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symbol" className={`text-sm font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                      Token Symbol
                    </Label>
                    <Input
                      id="symbol"
                      placeholder="e.g., BOPX"
                      value={form.symbol}
                      onChange={onChange("symbol")}
                      disabled={!connected || submitting}
                      className={`font-mono tracking-wider transition-colors duration-300 ${isDarkMode
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-purple-400'
                        : 'border-pink-200/30 focus:border-purple-400'
                        }`}
                      maxLength={10}
                    />
                    {errors.symbol && (
                      <p className="text-xs text-destructive flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>{errors.symbol}</span>
                      </p>
                    )}

                    {/* Real-time Symbol Availability Check */}
                    {form.symbol && form.symbol.trim() && (
                      <div className="mt-2">
                        {checkingSymbol ? (
                          <Alert className="border-blue-200 bg-blue-50">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <AlertDescription className="text-blue-800 text-xs">
                              Checking symbol availability...
                            </AlertDescription>
                          </Alert>
                        ) : symbolError ? (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              {symbolError}
                            </AlertDescription>
                          </Alert>
                        ) : symbolCheck ? (
                          symbolCheck.isAvailable ? (
                            <Alert className="border-green-200 bg-green-50">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <AlertDescription className="text-green-800 text-xs">
                                ✅ Symbol "{symbolCheck.symbol}" is available!
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                <div className="space-y-1">
                                  <p className="font-semibold">
                                    ⚠️ Symbol "{symbolCheck.symbol}" is already in use!
                                  </p>
                                  <p>Existing tokens:</p>
                                  <div className="space-y-1">
                                    {symbolCheck.existingTokens.slice(0, 2).map((token, index) => (
                                      <div key={index} className="text-xs bg-red-100 p-1 rounded">
                                        {token.name} ({token.networkName})
                                      </div>
                                    ))}
                                  </div>
                                  <p className="font-medium">
                                    💡 Try: {symbolCheck.symbol}2, {symbolCheck.symbol}V2, or {symbolCheck.symbol}NEW
                                  </p>
                                </div>
                              </AlertDescription>
                            </Alert>
                          )
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <Button type="button" variant="outline" disabled className="opacity-50 bg-transparent">
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!connected || !!errors.name || !!errors.symbol}
                      className="bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 border border-purple-200 hover:border-purple-300"
                    >
                      Next: Addresses
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6" aria-label="Step 2: Addresses">
                  <div className="space-y-2">
                    <Label htmlFor="collection" className="text-sm font-semibold">
                      Collection Address
                    </Label>
                    <Input
                      id="collection"
                      placeholder="0x..."
                      value={form.collection}
                      onChange={onChange("collection")}
                      disabled={!connected || submitting}
                      className="border-pink-200/30 focus:border-purple-400 font-mono"
                    />
                    {errors.collection && (
                      <p className="text-xs text-destructive flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>{errors.collection}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="royaltyPercentage" className="text-sm font-semibold">
                      Royalty Percentage
                    </Label>
                    <Input
                      id="royaltyPercentage"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="3.0"
                      value={form.royaltyPercentage}
                      onChange={onChange("royaltyPercentage")}
                      disabled={!connected || submitting}
                      className="border-pink-200/30 focus:border-purple-400"
                    />
                    {errors.royaltyPercentage && (
                      <p className="text-xs text-destructive flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>{errors.royaltyPercentage}</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Enter the royalty percentage (0-100).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="royaltyRecipient" className="text-sm font-semibold">
                      Royalty Recipient Address
                    </Label>
                    <Input
                      id="royaltyRecipient"
                      type="text"
                      placeholder="0x..."
                      value={form.royaltyRecipient}
                      onChange={onChange("royaltyRecipient")}
                      disabled={!connected || submitting}
                      className="border-pink-200/30 focus:border-purple-400"
                    />
                    {errors.royaltyRecipient && (
                      <p className="text-xs text-destructive flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>{errors.royaltyRecipient}</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Address that will receive the royalty payments.
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setStep(3)}
                      disabled={!connected || !!errors.collection || !!errors.royaltyPercentage || !!errors.royaltyRecipient}
                      className="bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 border border-purple-200 hover:border-purple-300"
                    >
                      Next: Socials
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3" aria-label="Step 3: Socials">
                  {/* Image Upload - Compact */}
                  <div className="space-y-1">
                    <Label htmlFor="image" className="text-xs font-semibold">
                      Collection Image (optional)
                    </Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageUpload}
                      disabled={!connected || submitting}
                      className="border-gray-200 focus:border-purple-400 h-8 text-xs"
                    />
                    {errors.image && (
                      <p className="text-xs text-destructive flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>{errors.image}</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {form.image ? "✅ Image uploaded" : "Max 500KB • JPEG, PNG, GIF, WebP"}
                    </p>
                  </div>

                  {/* Social Links - Compact Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="website" className="text-xs font-semibold">
                        Website (optional)
                      </Label>
                      <Input
                        id="website"
                        placeholder="https://your-site.xyz"
                        value={form.website}
                        onChange={onChange("website")}
                        disabled={!connected || submitting}
                        className="border-gray-200 focus:border-purple-400 h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="twitter" className="text-xs font-semibold">
                        Twitter (X) Username
                      </Label>
                      <Input
                        id="twitter"
                        placeholder="@bidbop"
                        value={form.twitter}
                        onChange={onChange("twitter")}
                        disabled={!connected || submitting}
                        className="border-gray-200 focus:border-purple-400 h-8 text-xs"
                      />
                      <p className="text-xs text-muted-foreground">Links to https://x.com/yourhandle</p>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="discord" className="text-xs font-semibold">
                        Discord (optional)
                      </Label>
                      <Input
                        id="discord"
                        placeholder="https://discord.gg/..."
                        value={form.discord}
                        onChange={onChange("discord")}
                        disabled={!connected || submitting}
                        className="border-gray-200 focus:border-purple-400 h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="telegram" className="text-xs font-semibold">
                        Telegram (optional)
                      </Label>
                      <Input
                        id="telegram"
                        placeholder="@username or https://t.me/username"
                        value={form.telegram}
                        onChange={onChange("telegram")}
                        disabled={!connected || submitting}
                        className="border-gray-200 focus:border-purple-400 h-8 text-xs"
                      />
                      <p className="text-xs text-muted-foreground">Username or invite link</p>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor="opensea" className="text-xs font-semibold">
                        OpenSea Collection Slug (optional)
                      </Label>
                      <Input
                        id="opensea"
                        placeholder="cool-cats-nft"
                        value={form.opensea}
                        onChange={onChange("opensea")}
                        disabled={!connected || submitting}
                        className="border-gray-200 focus:border-purple-400 h-8 text-xs"
                      />
                      <p className="text-xs text-muted-foreground">Collection slug from OpenSea URL (e.g., "cool-cats-nft" from opensea.io/collection/cool-cats-nft)</p>
                    </div>
                  </div>

                  {/* Compact Ready Message */}
                  <div className="p-2 rounded-lg border border-blue-400/40 bg-blue-400/10 text-xs">
                    <strong className="text-blue-600">Ready to Deploy:</strong> Strategy token will be deployed to blockchain.
                    Solver payment configurable after deployment.
                  </div>

                  {/* Deployment Fee Display */}
                  {connected && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium text-blue-900">Deployment Fee</span>
                        </div>
                        <div className="text-right">
                          {loadingFee ? (
                            <div className="flex items-center gap-2">
                              <Spinner className="h-3 w-3" />
                              <span className="text-xs text-blue-700">Loading...</span>
                            </div>
                          ) : deploymentFee ? (
                            <div>
                              <div className="text-sm font-semibold text-blue-900">
                                {formatWeiToEth(deploymentFee)} {getChainConfig(chainId)?.currency || 'ETH'}
                              </div>
                              <div className="text-xs text-blue-600">
                                Required for deployment
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-blue-700">
                              Fee not available
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Compact Navigation */}
                  <div className="flex items-center justify-between pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="h-8 px-3 text-xs">
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={!connected || submitting || !isValid}
                      className="bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow-md h-8 px-4 text-xs"
                    >
                      {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Spinner className="h-3 w-3" />
                          <span>Deploying…</span>
                        </span>
                      ) : (
                        <span>Deploy Strategy Token</span>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="sr-only" aria-live="polite">
                {deployError ? `Error: ${deployError}` : ""}
              </div>
            </div>

          </form>

          {/* Error Display */}
          {deployError && (
            <div className="mt-6 p-4 rounded-xl border border-destructive/40 bg-destructive/10">
              <div className="flex items-center space-x-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold">Preview Failed</span>
              </div>
              <p className="mt-2 text-sm text-destructive/80">{deployError}</p>
            </div>
          )}

        </CardContent>
      </Card>
    </section>
  )
}
