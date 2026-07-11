import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SavedQrCode } from '../domain/qr'
import { cloudWalletLabel, createCloudWalletKey, downloadCloudWallet, isCloudWalletKey, uploadCloudWallet } from '../lib/cloudWallet'
import { useLocalStorage } from './useLocalStorage'

type CloudSyncState = 'idle' | 'syncing' | 'synced' | 'error'

interface CloudSyncStatus {
  state: CloudSyncState
  messageId: string
}

export interface CloudWalletControls {
  enabled: boolean
  label: string
  status: CloudSyncStatus
  enable: () => Promise<string>
  uploadNow: () => Promise<void>
  restore: () => Promise<void>
  importKey: (walletKey: string) => Promise<void>
  copyKey: () => Promise<void>
  disconnect: () => void
}

const parseStoredString = (value: string): string => {
  const parsed: unknown = JSON.parse(value)
  return typeof parsed === 'string' ? parsed : ''
}

export function useCloudWallet(codes: SavedQrCode[], setCodes: (codes: SavedQrCode[]) => void): CloudWalletControls {
  const [walletKey, setWalletKey] = useLocalStorage('cloud-wallet-key', '', parseStoredString)
  const [status, setStatus] = useState<CloudSyncStatus>({ state: 'idle', messageId: 'default-cloud-sync-off' })
  const lastUploadedJson = useRef(JSON.stringify(codes))
  const walletKeyRef = useRef(walletKey)
  walletKeyRef.current = walletKey

  const upload = useCallback(async (key: string, nextCodes: SavedQrCode[], messageId = 'default-cloud-sync-saved') => {
    setStatus({ state: 'syncing', messageId: 'default-cloud-sync-saving' })
    try {
      await uploadCloudWallet(key, nextCodes)
      lastUploadedJson.current = JSON.stringify(nextCodes)
      setStatus({ state: 'synced', messageId })
    } catch {
      setStatus({ state: 'error', messageId: 'default-cloud-sync-error' })
      throw new Error('Cloud sync failed')
    }
  }, [])

  const enable = useCallback(async () => {
    const nextWalletKey = createCloudWalletKey()
    setWalletKey(nextWalletKey)
    await upload(nextWalletKey, codes, 'default-cloud-sync-enabled')
    return nextWalletKey
  }, [codes, setWalletKey, upload])

  const uploadNow = useCallback(async () => {
    if (!walletKeyRef.current) return
    await upload(walletKeyRef.current, codes)
  }, [codes, upload])

  const restore = useCallback(async () => {
    if (!walletKeyRef.current) return
    setStatus({ state: 'syncing', messageId: 'default-cloud-sync-restoring' })
    try {
      const restoredCodes = await downloadCloudWallet(walletKeyRef.current)
      setCodes(restoredCodes)
      lastUploadedJson.current = JSON.stringify(restoredCodes)
      setStatus({ state: 'synced', messageId: 'default-cloud-sync-restored' })
    } catch {
      setStatus({ state: 'error', messageId: 'default-cloud-sync-error' })
      throw new Error('Cloud restore failed')
    }
  }, [setCodes])

  const importKey = useCallback(async (nextWalletKey: string) => {
    if (!isCloudWalletKey(nextWalletKey)) throw new Error('Invalid cloud wallet key')
    setWalletKey(nextWalletKey.trim())
    setStatus({ state: 'syncing', messageId: 'default-cloud-sync-restoring' })
    try {
      const restoredCodes = await downloadCloudWallet(nextWalletKey.trim())
      setCodes(restoredCodes)
      lastUploadedJson.current = JSON.stringify(restoredCodes)
      setStatus({ state: 'synced', messageId: 'default-cloud-sync-restored' })
    } catch {
      setStatus({ state: 'error', messageId: 'default-cloud-sync-error' })
      throw new Error('Cloud restore failed')
    }
  }, [setCodes, setWalletKey])

  const copyKey = useCallback(async () => {
    if (!walletKeyRef.current) return
    await navigator.clipboard.writeText(walletKeyRef.current)
    setStatus({ state: 'synced', messageId: 'default-cloud-sync-key-copied' })
  }, [])

  const disconnect = useCallback(() => {
    setWalletKey('')
    setStatus({ state: 'idle', messageId: 'default-cloud-sync-off' })
  }, [setWalletKey])

  useEffect(() => {
    if (!walletKey) {
      lastUploadedJson.current = JSON.stringify(codes)
      return
    }
    const nextJson = JSON.stringify(codes)
    if (nextJson === lastUploadedJson.current) return
    const timeout = window.setTimeout(() => {
      void upload(walletKey, codes).catch(() => undefined)
    }, 1200)
    return () => window.clearTimeout(timeout)
  }, [codes, upload, walletKey])

  return useMemo(() => ({
    enabled: walletKey.length > 0,
    label: cloudWalletLabel(walletKey),
    status,
    enable,
    uploadNow,
    restore,
    importKey,
    copyKey,
    disconnect,
  }), [copyKey, disconnect, enable, importKey, restore, status, uploadNow, walletKey])
}
