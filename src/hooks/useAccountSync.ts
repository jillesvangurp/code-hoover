import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { mergeSavedCodes, type SavedQrCode } from '../domain/qr'
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
  const [status, setStatus] = useState<AccountSyncStatus>(() => (
    session
      ? { state: 'synced', messageId: 'default-account-sync-enabled' }
      : { state: 'idle', messageId: 'default-account-sync-off' }
  ))
  const lastUploadedJson = useRef(JSON.stringify(codes))
  const lastSyncedSessionToken = useRef<string | null>(null)
  const sessionRef = useRef(session)
  sessionRef.current = session

  const upload = useCallback(async (nextSession: AccountSession, nextCodes: SavedQrCode[], messageId = 'default-account-sync-saved') => {
    setStatus({ state: 'syncing', messageId: 'default-account-sync-saving' })
    try {
      const accountCodes = await downloadAccountCodes(nextSession)
      const mergedCodes = mergeSavedCodes(nextCodes, accountCodes)
      const savedCodes = await uploadAccountCodes(nextSession, mergedCodes)
      lastUploadedJson.current = JSON.stringify(savedCodes)
      lastSyncedSessionToken.current = nextSession.token
      setCodes(savedCodes)
      setStatus({ state: 'synced', messageId })
    } catch {
      setStatus({ state: 'error', messageId: 'default-account-sync-error' })
      throw new Error('Account sync failed')
    }
  }, [setCodes])

  const register = useCallback(async (email: string, password: string) => {
    setStatus({ state: 'syncing', messageId: 'default-account-sync-creating' })
    try {
      const result = await createAccount(email, password, codes)
      setSession(result.session)
      lastUploadedJson.current = JSON.stringify(codes)
      lastSyncedSessionToken.current = result.session.token
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
      const mergedCodes = mergeSavedCodes(codes, result.codes)
      const savedCodes = await uploadAccountCodes(result.session, mergedCodes)
      setSession(result.session)
      setCodes(savedCodes)
      lastUploadedJson.current = JSON.stringify(savedCodes)
      lastSyncedSessionToken.current = result.session.token
      setStatus({ state: 'synced', messageId: 'default-account-sync-restored' })
    } catch {
      setStatus({ state: 'error', messageId: 'default-account-sync-sign-in-error' })
      throw new Error('Sign in failed')
    }
  }, [codes, setCodes, setSession])

  const uploadNow = useCallback(async () => {
    if (!sessionRef.current) return
    await upload(sessionRef.current, codes)
  }, [codes, upload])

  const restore = useCallback(async () => {
    if (!sessionRef.current) return
    setStatus({ state: 'syncing', messageId: 'default-account-sync-restoring' })
    try {
      const restoredCodes = await downloadAccountCodes(sessionRef.current)
      const mergedCodes = mergeSavedCodes(codes, restoredCodes)
      const savedCodes = await uploadAccountCodes(sessionRef.current, mergedCodes)
      setCodes(savedCodes)
      lastUploadedJson.current = JSON.stringify(savedCodes)
      lastSyncedSessionToken.current = sessionRef.current.token
      setStatus({ state: 'synced', messageId: 'default-account-sync-restored' })
    } catch {
      setStatus({ state: 'error', messageId: 'default-account-sync-error' })
      throw new Error('Account restore failed')
    }
  }, [codes, setCodes])

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
      lastSyncedSessionToken.current = null
      setStatus((current) => (
        current.messageId === 'default-account-sync-off'
          ? current
          : { state: 'idle', messageId: 'default-account-sync-off' }
      ))
      return
    }
    setStatus((current) => (
      current.messageId === 'default-account-sync-off'
        ? { state: 'synced', messageId: 'default-account-sync-enabled' }
        : current
    ))
    const nextJson = JSON.stringify(codes)
    const shouldRefreshSession = lastSyncedSessionToken.current !== session.token
    if (!shouldRefreshSession && nextJson === lastUploadedJson.current) return
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
