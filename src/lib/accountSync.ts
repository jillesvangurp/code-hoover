import { parseSavedCodes, type SavedQrCode } from '../domain/qr'
import {
  AccountReauthenticationRequiredError,
  decryptAccountWallet,
  decryptRememberedAccountWallet,
  deriveAccountCredential,
  deriveLegacyAccountCredential,
  encryptAccountWallet,
  encryptRememberedAccountWallet,
  forgetAccountKey,
  parseEncryptedAccountWallet,
  rememberAccountKey,
} from './accountCrypto'

const API_PREFIX = '/api/account'

export interface AccountSession {
  token: string
  email: string
  cryptoVersion: 2
}

export interface AccountResult {
  session: AccountSession
  codes: SavedQrCode[]
}

export function isAccountReauthenticationRequired(error: unknown): boolean {
  return error instanceof AccountReauthenticationRequiredError
}

interface AccountApiResponse {
  sessionToken: string
  user: {
    email: string
  }
  wallet?: unknown
}

function parseAccountSession(value: unknown): AccountSession | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (typeof candidate.token !== 'string' || typeof candidate.email !== 'string' || candidate.cryptoVersion !== 2) return null
  return { token: candidate.token, email: candidate.email, cryptoVersion: 2 }
}

export function parseStoredAccountSession(value: string): AccountSession | null {
  return parseAccountSession(JSON.parse(value))
}

function sessionFromResponse(value: AccountApiResponse): AccountSession {
  return { token: value.sessionToken, email: value.user.email, cryptoVersion: 2 }
}

async function accountRequest(path: string, init?: RequestInit, session?: AccountSession): Promise<Response> {
  return fetch(`${API_PREFIX}/${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(session ? { authorization: `Bearer ${session.token}` } : {}),
      ...init?.headers,
    },
  })
}

async function readAccountResponse(response: Response): Promise<AccountApiResponse> {
  if (!response.ok) throw new Error(`Account request failed: ${response.status}`)
  return response.json() as Promise<AccountApiResponse>
}

export async function createAccount(email: string, password: string, codes: SavedQrCode[]): Promise<AccountResult> {
  const [{ wallet, key }, credential] = await Promise.all([
    encryptAccountWallet(password, codes),
    deriveAccountCredential(email, password),
  ])
  const value = await readAccountResponse(await accountRequest('register', {
    method: 'POST',
    body: JSON.stringify({ email, credential, wallet }),
  }))
  const session = sessionFromResponse(value)
  await rememberAccountKey(session.email, key, wallet.kdf)
  return { session, codes }
}

async function legacySignIn(email: string, password: string, credential: string, legacySalt: string): Promise<AccountResult> {
  const legacyCredential = await deriveLegacyAccountCredential(password, legacySalt)
  const legacyValue = await readAccountResponse(await accountRequest('login', {
    method: 'POST',
    body: JSON.stringify({ email, legacyCredential }),
  }))
  const session = sessionFromResponse(legacyValue)
  const legacyWallet = legacyValue.wallet as { version?: unknown, codes?: unknown } | undefined
  if (!legacyWallet) throw new Error('Legacy account migration failed')
  const encrypted = legacyWallet.version === 2 || legacyWallet.version === 3
    ? await decryptAccountWallet(password, legacyWallet)
    : null
  const codes = encrypted?.codes ?? (legacyWallet.version === 1
    ? parseSavedCodes(JSON.stringify(legacyWallet.codes ?? []))
    : (() => { throw new Error('Legacy account migration failed') })())
  const next = encrypted ?? await encryptAccountWallet(password, codes)
  const migration = await accountRequest('migrate', {
    method: 'POST',
    body: JSON.stringify({ credential, wallet: next.wallet }),
  }, session)
  if (!migration.ok) throw new Error(`Account migration failed: ${migration.status}`)
  await rememberAccountKey(session.email, next.key, next.wallet.kdf)
  return { session, codes }
}

export async function signInAccount(email: string, password: string): Promise<AccountResult> {
  const credential = await deriveAccountCredential(email, password)
  const response = await accountRequest('login', {
    method: 'POST',
    body: JSON.stringify({ email, credential }),
  })
  if (response.status === 428) {
    const body = await response.json() as { legacySalt?: unknown }
    if (typeof body.legacySalt !== 'string') throw new Error('Legacy account migration failed')
    return legacySignIn(email, password, credential, body.legacySalt)
  }
  const value = await readAccountResponse(response)
  const session = sessionFromResponse(value)
  const legacyWallet = value.wallet as { version?: unknown, codes?: unknown } | undefined
  if (legacyWallet?.version === 1) {
    const codes = parseSavedCodes(JSON.stringify(legacyWallet.codes ?? []))
    const encrypted = await encryptAccountWallet(password, codes)
    const replacement = await accountRequest('wallet', {
      method: 'PUT',
      body: JSON.stringify({ wallet: encrypted.wallet }),
    }, session)
    if (!replacement.ok) throw new Error(`Account wallet recovery failed: ${replacement.status}`)
    await rememberAccountKey(session.email, encrypted.key, encrypted.wallet.kdf)
    return { session, codes }
  }
  const decrypted = await decryptAccountWallet(password, parseEncryptedAccountWallet(value.wallet))
  await rememberAccountKey(session.email, decrypted.key, decrypted.wallet.kdf)
  return { session, codes: decrypted.codes }
}

export async function signOutAccount(session: AccountSession): Promise<void> {
  try {
    await accountRequest('logout', { method: 'POST' }, session)
  } finally {
    await forgetAccountKey(session.email)
  }
}

export async function deleteAccount(session: AccountSession): Promise<void> {
  const response = await accountRequest('me', { method: 'DELETE' }, session)
  if (!response.ok) throw new Error(`Account delete failed: ${response.status}`)
  await forgetAccountKey(session.email)
}

export async function downloadAccountCodes(session: AccountSession): Promise<SavedQrCode[]> {
  const response = await accountRequest('wallet', undefined, session)
  if (response.status === 401 || response.status === 428) throw new AccountReauthenticationRequiredError()
  if (!response.ok) throw new Error(`Account restore failed: ${response.status}`)
  const body = await response.json() as { wallet?: unknown }
  if (!body.wallet) return []
  return decryptRememberedAccountWallet(session.email, body.wallet)
}

export async function uploadAccountCodes(session: AccountSession, codes: SavedQrCode[]): Promise<SavedQrCode[]> {
  const wallet = await encryptRememberedAccountWallet(session.email, codes)
  const response = await accountRequest('wallet', {
    method: 'PUT',
    body: JSON.stringify({ wallet }),
  }, session)
  if (response.status === 401) throw new AccountReauthenticationRequiredError()
  if (!response.ok) throw new Error(`Account sync failed: ${response.status}`)
  return codes
}
