'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig } from 'wagmi'
import { lightTheme, connectorsForWallets } from '@rainbow-me/rainbowkit'
import { mainnet, optimism, arbitrum, base } from 'wagmi/chains'
import { defineChain } from 'viem'
import { http } from 'viem'
import { useState, useEffect } from 'react'
import { metaMaskWallet } from '@rainbow-me/rainbowkit/wallets'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { ThemeProvider } from '@/components/theme-provider'

import '@rainbow-me/rainbowkit/styles.css'

// Define Monad Testnet chain configuration
const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz/'],
    },
    public: {
      http: ['https://testnet-rpc.monad.xyz/'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://testnet.monadexplorer.com/',
    },
  },
  iconUrl: 'https://res.cloudinary.com/deapg3k8f/image/upload/v1760652486/54777_lwespx.png',
  testnet: true,
})

// Define Monad Mainnet Beta chain configuration
const monadMainnet = defineChain({
  id: 143,
  name: 'Monad Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc1.monad.xyz'],
    },
    public: {
      http: ['https://rpc1.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://mainnet-beta.monvision.io',
    },
  },
  iconUrl: 'https://res.cloudinary.com/deapg3k8f/image/upload/v1760652486/54777_lwespx.png',
  testnet: false,
})

// Define Apechain Mainnet chain configuration
const apechain = defineChain({
  id: 33139,
  name: 'Apechain',
  nativeCurrency: {
    decimals: 18,
    name: 'ApeCoin',
    symbol: 'APE',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.apechain.com'],
    },
    public: {
      http: ['https://rpc.apechain.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Apescan',
      url: 'https://apescan.io',
    },
  },
  testnet: false,
})

// Define HyperVM Mainnet chain configuration
const hypervm = defineChain({
  id: 999,
  name: 'HyperEVM',
  nativeCurrency: {
    decimals: 18,
    name: 'HyperVM',
    symbol: 'HYPE',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.hypurrscan.io'],
    },
    public: {
      http: ['https://rpc.hypurrscan.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Hypurrscan',
      url: 'https://hypurrscan.io',
    },
  },
  testnet: false,
})

// Define Taiko Alethia chain configuration
const taikoAlethia = defineChain({
  id: 167000,
  name: 'Taiko Alethia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.taiko.xyz'],
    },
    public: {
      http: ['https://rpc.taiko.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Taiko Explorer',
      url: 'https://explorer.taiko.xyz',
    },
  },
  iconUrl: 'https://avatars.githubusercontent.com/u/99078433?s=280&v=4',
  testnet: false,
})


const connectors = () => {
  // Only create connectors on client-side to avoid SSR issues
  // TODO: update when https://github.com/rainbow-me/rainbowkit/issues/2476 is resolved
  if (typeof window === "undefined") {
    return []
  }

  return connectorsForWallets(
    [
      {
        groupName: 'Recommended',
        wallets: [metaMaskWallet],
      },
    ],
    {
      appName: 'BidBop',
      projectId: 'c84de3ab5948f5baa91c1abc6b385618',
    }
  )
}

// new test

const config = createConfig({
  connectors: connectors(),
  chains: [mainnet, optimism, arbitrum, base, monadTestnet, monadMainnet, apechain, hypervm, taikoAlethia],
  transports: {
    [mainnet.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [monadTestnet.id]: http(),
    [monadMainnet.id]: http(),
    [apechain.id]: http(),
    [hypervm.id]: http(),
    [taikoAlethia.id]: http(),
  },
  ssr: true,
})

// Debug: Log available chains
if (typeof window !== 'undefined') {
  console.log('Available chains:', config.chains.map(chain => ({ id: chain.id, name: chain.name })))
  console.log('Monad Testnet config:', monadTestnet)
  console.log('Monad Mainnet config:', monadMainnet)
  console.log('Apechain config:', apechain)
  console.log('HyperVM config:', hypervm)
  console.log('Taiko Alethia config:', taikoAlethia)
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes - longer cache for wallet state
        retry: false,
        refetchOnWindowFocus: false, // Don't refetch on window focus to maintain connection state
        refetchOnMount: false, // Don't refetch on component mount
      },
    },
  }))

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        {mounted ? (
          <RainbowKitProvider
            theme={lightTheme({
              accentColor: '#651bcf', // Custom purple
              accentColorForeground: 'white',
              borderRadius: 'large',
              fontStack: 'system',
              overlayBlur: 'small',
            })}
            showRecentTransactions={true}
            appInfo={{
              appName: 'BidBop',
              learnMoreUrl: 'https://bidbop.com',
            }}
            initialChain={monadTestnet}
            modalSize="compact"
          >
            <ThemeProvider defaultTheme="light" storageKey="bidbop-ui-theme">
              {children}
            </ThemeProvider>
          </RainbowKitProvider>
        ) : (
          <ThemeProvider defaultTheme="light" storageKey="bidbop-ui-theme">
            {children}
          </ThemeProvider>
        )}
      </WagmiProvider>
    </QueryClientProvider>
  )
}
