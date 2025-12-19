'use client'

import type { Connector } from 'wagmi'
import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'

// Custom hook to safely use wagmi hooks with SSR
export function useSafeAccount() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Always call useAccount at the top level (required by rules of hooks)
  const wagmiAccount = useAccount()

  // Use wagmi account if mounted and available
  if (mounted && wagmiAccount) {
    return {
      ...wagmiAccount,
      // Ensure connector is always defined
      connector: wagmiAccount.connector ?? createPlaceholderConnector(),
      mounted
    }
  }

  // Return fallback account for SSR
  return {
    address: undefined,
    addresses: undefined,
    chain: undefined,
    chainId: undefined,
    connector: createPlaceholderConnector(),
    isConnected: false,
    isConnecting: false,
    isDisconnected: true,
    isReconnecting: false,
    status: 'disconnected' as const,
    mounted
  }
}

function createPlaceholderConnector(): Connector {
  // This is a placeholder connector object for SSR environments.
  // It does NOT implement the actual Connector contract.
  return {
    id: 'placeholder',
    name: 'Placeholder Wallet',
    type: 'injected',
    ready: false,
    uid: 'placeholder-uid',
    isAuthorized: async () => false,
    iconBackground: '#ccc',
    connect: async () => {
      throw new Error('Connector unavailable during SSR')
    },
    disconnect: async () => {},
    getAccounts: async () => [],
    getChainId: async () => 1,
    getProvider: async () => undefined,
    switchChain: async () => {
      throw new Error('switchChain unavailable during SSR')
    },
    setup: async () => {},
    onAccountsChanged: () => {},
    onChainChanged: () => {},
    onDisconnect: () => {},
    onMessage: () => {},
  } as unknown as Connector
}
