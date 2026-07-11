import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SavedQrCode } from '../domain/qr'
import { createAccount, deleteAccount, downloadAccountCodes, parseStoredAccountSession, signInAccount, signOutAccount, uploadAccountCodes, type AccountSession } from '../lib/accountSync'
import { useLocalStorage } from './useLocalStorage'

type AccountSyncState = 'idle' | 'syncing' | 'synced' | 'error'

interface AccountSyncStatus {
  state: AccountSyncState
  messageId: string
}

export interface AccountSyncControls {
  signedIn: boolean
  email: string
  status: AccountSyncStatus
  signIn: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  uploadNow: () => Promise<void>
  restore: () => Promise<void>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<void>
}

export function useAccountSync(codes: SavedQrCode[], setCodes: (codes: SavedQrCode[]) => void): AccountSyncControls {
  const [session, setSession] = useLocalStorage<AccountSession | null>('account-session', null, parseStoredAccountSession)
  const [status, setStatus] = useState<AccountSyncStatus>({ state: 'idle', messageId: 'default-account-sync-off' })
  const lastUploadedJson = useRef(JSON.stringify(codes))
  const sessionRef = useRef(session)
  sessionRef.current = session

  const upload = useCallback(async (nextSession: AccountSession, nextCodes: SavedQrCode[], messageId = 'default-account-sync-saved') => {
    setStatus({ state: 'syncing', messageId: 'default-account-sync-saving' })
    try {
      await uploadAccountCodes(nextSession, nextCodes)
      lastUploadedJson.current = JSON.stringify(nextCodes)
      setStatus({ state: 'synced', messageId })
    } catch {
      setStatus({ state: 'error', messageId: 'default-account-sync-error' })
      throw new Error('Account sync failed')
    }
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    setStatus({ state: 'syncing', messageId: 'default-account-sync-creating' })
    try {
      const result = await createAccount(email, password, codes)
      setSession(result.session)
      lastUploadedJson.current = JSON.stringify(codes)
      setStatus({ state: 'synced', messageId: 'default-account-sync-enabled' })
    } catch {
      setStatus({ state: 'error', messageId: 'default-account-sync-sign-in-error' })
      throw new Error('Account creation failed')
    }
  }, [codes, setSession])

  const signIn = useCallback(async (email: string, password: string) => {
    setStatus({ state: 'syncing', messageId: 'default-account-sync-signing-in' })
    try {
      const result = await signInAccount(email, password)
      setSession(result.session)
      setCodes(result.codes)
      lastUploadedJson.current = JSON.stringify(result.codes)
      setStatus({ state: 'synced', messageId: 'default-account-sync-restored' })
    } catch {
      setStatus({ state: 'error', messageId: 'default-account-sync-sign-in-error' })
      throw new Error('Sign in failed')
    }
  }, [setCodes, setSession])

  const uploadNow = useCallback(async () => {
    if (!sessionRef.current) return
    await upload(sessionRef.current, codes)
  }, [codes, upload])

  const restore = useCallback(async () => {
    if (!sessionRef.current) return
    setStatus({ state: 'syncing', messageId: 'default-account-sync-restoring' })
    try {
      const restoredCodes = await downloadAccountCodes(sessionRef.current)
      setCodes(restoredCodes)
      lastUploadedJson.current = JSON.stringify(restoredCodes)
      setStatus({ state: 'synced', messageId: 'default-account-sync-restored' })
    } catch {
      setStatus({ state: 'error', messageId: 'default-account-sync-error' })
      throw new Error('Account restore failed')
    }
  }, [setCodes])

  const signOut = useCallback(async () => {
    const currentSession = sessionRef.current
    setSession(null)
    setStatus({ state: 'idle', messageId: 'default-account-sync-off' })
    if (currentSession) await signOutAccount(currentSession).catch(() => undefined)
  }, [setSession])

  const removeAccount = useCallback(async () => {
    const currentSession = sessionRef.current
    if (!currentSession) return
    setStatus({ state: 'syncing', messageId: 'default-account-sync-deleting' })
    try {
      await deleteAccount(currentSession)
      setSession(null)
      setStatus({ state: 'idle', messageId: 'default-account-sync-deleted' })
    } catch {
      setStatus({ state: 'error', messageId: 'default-account-sync-error' })
      throw new Error('Account delete failed')
    }
  }, [setSession])

  useEffect(() => {
    if (!session) {
      lastUploadedJson.current = JSON.stringify(codes)
      return
    }
    const nextJson = JSON.stringify(codes)
    if (nextJson === lastUploadedJson.current) return
    const timeout = window.setTimeout(() => {
      void upload(session, codes).catch(() => undefined)
    }, 1200)
    return () => window.clearTimeout(timeout)
  }, [codes, session, upload])

  return useMemo(() => ({
    signedIn: session !== null,
    email: session?.email ?? '',
    status,
    signIn,
    register,
    uploadNow,
    restore,
    signOut,
    deleteAccount: removeAccount,
  }), [removeAccount, register, restore, session, signIn, signOut, status, uploadNow])
}
