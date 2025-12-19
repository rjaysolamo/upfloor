'use client'

import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi'
import { useMemo } from 'react'

export type RainbowWalletState = {
  address?: string
  chainId?: number
  isConnecting: boolean
  isConnected: boolean
  error?: string
  connect: () => void
  disconnect: () => void
  shortAddress: string
  hasProvider: boolean
  walletName: string
}

export function useRainbowWallet(): RainbowWalletState {
  // Safely call wagmi hooks with error handling
  let accountData, connectData, disconnectData, chainIdData
  
  try {
    accountData = useAccount()
    connectData = useConnect()
    disconnectData = useDisconnect()
    chainIdData = useChainId()
  } catch (error) {
    console.warn('Wagmi hooks failed, using fallback values:', error)
    accountData = { address: undefined, isConnected: false, isConnecting: false }
    connectData = { connect: () => {}, connectors: [], error: null }
    disconnectData = { disconnect: () => {} }
    chainIdData = undefined
  }

  const { address, isConnected, isConnecting } = accountData
  const { connect, connectors, error } = connectData
  const { disconnect } = disconnectData
  const chainId = chainIdData

  const shortAddress = useMemo(() => {
    if (!address) return ""
    return `${address.slice(0, 6)}…${address.slice(-4)}`
  }, [address])

  const walletName = useMemo(() => {
    if (!isConnected || !connectors.length) return ""
    return connectors[0]?.name || "Wallet"
  }, [isConnected, connectors])

  const hasProvider = connectors.length > 0

  const handleConnect = () => {
    if (connectors.length > 0) {
      connect({ connector: connectors[0] })
    }
  }

  return {
    address,
    chainId,
    isConnecting,
    isConnected,
    error: error?.message,
    connect: handleConnect,
    disconnect,
    shortAddress,
    hasProvider,
    walletName,
  }
}
