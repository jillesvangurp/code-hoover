import { parseSavedCodes, type SavedQrCode } from '../domain/qr'

const ACCOUNT_WALLET_CONTEXT = new TextEncoder().encode('code-hoover:account-wallet:v2')
const AUTH_SALT_PREFIX = 'code-hoover:account-auth:v2:'
const KDF_ITERATIONS = 600_000
const MAX_KDF_ITERATIONS = 1_000_000
const SALT_BYTES = 16
const IV_BYTES = 12
const KEY_DATABASE = 'code-hoover-keys'
const KEY_STORE = 'account-keys'

export interface AccountWalletKdf {
  name: 'PBKDF2'
  hash: 'SHA-256'
  iterations: number
  salt: string
}

export interface EncryptedAccountWallet {
  version: 2 | 3
  kdf: AccountWalletKdf
  cipher: {
    name: 'AES-GCM'
    iv: string
  }
  ciphertext: string
}

interface RememberedAccountKey {
  key: CryptoKey
  kdf: AccountWalletKdf
}

const rememberedKeys = new Map<string, RememberedAccountKey>()
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

function base64UrlEncode(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function base64UrlDecode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encrypted wallet')
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

function parseKdf(value: unknown): AccountWalletKdf {
  if (!value || typeof value !== 'object') throw new Error('Invalid encrypted wallet')
  const candidate = value as Record<string, unknown>
  if (candidate.name !== 'PBKDF2' || candidate.hash !== 'SHA-256') throw new Error('Invalid encrypted wallet')
  if (!Number.isInteger(candidate.iterations) || Number(candidate.iterations) < 100_000 || Number(candidate.iterations) > MAX_KDF_ITERATIONS) {
    throw new Error('Invalid encrypted wallet')
  }
  if (typeof candidate.salt !== 'string' || base64UrlDecode(candidate.salt).byteLength !== SALT_BYTES) throw new Error('Invalid encrypted wallet')
  return { name: 'PBKDF2', hash: 'SHA-256', iterations: Number(candidate.iterations), salt: candidate.salt }
}

export function parseEncryptedAccountWallet(value: unknown): EncryptedAccountWallet {
  if (!value || typeof value !== 'object') throw new Error('Invalid encrypted wallet')
  const candidate = value as Record<string, unknown>
  const cipher = candidate.cipher as Record<string, unknown> | undefined
  if ((candidate.version !== 2 && candidate.version !== 3) || !cipher || cipher.name !== 'AES-GCM') throw new Error('Invalid encrypted wallet')
  if (typeof cipher.iv !== 'string' || base64UrlDecode(cipher.iv).byteLength !== IV_BYTES) throw new Error('Invalid encrypted wallet')
  if (typeof candidate.ciphertext !== 'string' || candidate.ciphertext.length < 22 || candidate.ciphertext.length > 500_000) {
    throw new Error('Invalid encrypted wallet')
  }
  base64UrlDecode(candidate.ciphertext)
  return {
    version: candidate.version,
    kdf: parseKdf(candidate.kdf),
    cipher: { name: 'AES-GCM', iv: cipher.iv },
    ciphertext: candidate.ciphertext,
  }
}

async function deriveBits(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: toArrayBuffer(salt), iterations },
    material,
    256,
  )
  return new Uint8Array(bits)
}

async function deriveEncryptionKey(password: string, kdf: AccountWalletKdf): Promise<CryptoKey> {
  const keyBytes = await deriveBits(password, base64UrlDecode(kdf.salt), kdf.iterations)
  return crypto.subtle.importKey('raw', toArrayBuffer(keyBytes), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function deriveAccountCredential(email: string, password: string): Promise<string> {
  const salt = textEncoder.encode(`${AUTH_SALT_PREFIX}${normalizeEmail(email)}`)
  return base64UrlEncode(await deriveBits(password, salt, KDF_ITERATIONS))
}

export async function deriveLegacyAccountCredential(password: string, salt: string): Promise<string> {
  const decodedSalt = base64UrlDecode(salt)
  if (decodedSalt.byteLength !== SALT_BYTES) throw new Error('Invalid legacy account salt')
  return base64UrlEncode(await deriveBits(password, decodedSalt, 100_000))
}

async function encryptWithKey(codes: SavedQrCode[], key: CryptoKey, kdf: AccountWalletKdf): Promise<EncryptedAccountWallet> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const plaintext = textEncoder.encode(JSON.stringify(codes))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: ACCOUNT_WALLET_CONTEXT },
    key,
    plaintext,
  )
  return {
    version: 3,
    kdf,
    cipher: { name: 'AES-GCM', iv: base64UrlEncode(iv) },
    ciphertext: base64UrlEncode(new Uint8Array(encrypted)),
  }
}

async function decryptWithKey(wallet: EncryptedAccountWallet, key: CryptoKey): Promise<SavedQrCode[]> {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(base64UrlDecode(wallet.cipher.iv)),
      additionalData: ACCOUNT_WALLET_CONTEXT,
    },
    key,
    toArrayBuffer(base64UrlDecode(wallet.ciphertext)),
  )
  return parseSavedCodes(textDecoder.decode(decrypted))
}

export async function encryptAccountWallet(password: string, codes: SavedQrCode[]): Promise<{ wallet: EncryptedAccountWallet, key: CryptoKey }> {
  const kdf: AccountWalletKdf = {
    name: 'PBKDF2',
    hash: 'SHA-256',
    iterations: KDF_ITERATIONS,
    salt: base64UrlEncode(crypto.getRandomValues(new Uint8Array(SALT_BYTES))),
  }
  const key = await deriveEncryptionKey(password, kdf)
  return { wallet: await encryptWithKey(codes, key, kdf), key }
}

export async function decryptAccountWallet(password: string, value: unknown): Promise<{ codes: SavedQrCode[], key: CryptoKey, wallet: EncryptedAccountWallet }> {
  const wallet = parseEncryptedAccountWallet(value)
  const key = await deriveEncryptionKey(password, wallet.kdf)
  return { codes: await decryptWithKey(wallet, key), key, wallet }
}

function openKeyDatabase(): Promise<IDBDatabase> {
  if (!globalThis.indexedDB) return Promise.reject(new Error('Secure key storage unavailable'))
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(KEY_DATABASE, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(KEY_STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Secure key storage unavailable'))
  })
}

async function writeStoredKey(email: string, value: RememberedAccountKey | undefined): Promise<void> {
  const database = await openKeyDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(KEY_STORE, 'readwrite')
    const request = value
      ? transaction.objectStore(KEY_STORE).put(value, normalizeEmail(email))
      : transaction.objectStore(KEY_STORE).delete(normalizeEmail(email))
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('Secure key storage failed'))
  }).finally(() => database.close())
}

async function readStoredKey(email: string): Promise<RememberedAccountKey | null> {
  const database = await openKeyDatabase()
  return new Promise<RememberedAccountKey | null>((resolve, reject) => {
    const request = database.transaction(KEY_STORE).objectStore(KEY_STORE).get(normalizeEmail(email))
    request.onsuccess = () => resolve(request.result as RememberedAccountKey | undefined ?? null)
    request.onerror = () => reject(request.error ?? new Error('Secure key storage failed'))
  }).finally(() => database.close())
}

export async function rememberAccountKey(email: string, key: CryptoKey, kdf: AccountWalletKdf): Promise<void> {
  const stored = { key, kdf }
  rememberedKeys.set(normalizeEmail(email), stored)
  await writeStoredKey(email, stored).catch(() => undefined)
}

async function accountKey(email: string): Promise<RememberedAccountKey> {
  const normalized = normalizeEmail(email)
  const remembered = rememberedKeys.get(normalized)
  if (remembered) return remembered
  const stored = await readStoredKey(email).catch(() => null)
  if (!stored) throw new Error('Account encryption key unavailable')
  rememberedKeys.set(normalized, stored)
  return stored
}

export async function encryptRememberedAccountWallet(email: string, codes: SavedQrCode[]): Promise<EncryptedAccountWallet> {
  const stored = await accountKey(email)
  return encryptWithKey(codes, stored.key, stored.kdf)
}

export async function decryptRememberedAccountWallet(email: string, value: unknown): Promise<SavedQrCode[]> {
  const wallet = parseEncryptedAccountWallet(value)
  const stored = await accountKey(email)
  if (stored.kdf.salt !== wallet.kdf.salt || stored.kdf.iterations !== wallet.kdf.iterations) throw new Error('Account encryption key mismatch')
  return decryptWithKey(wallet, stored.key)
}

export async function forgetAccountKey(email: string): Promise<void> {
  rememberedKeys.delete(normalizeEmail(email))
  await writeStoredKey(email, undefined).catch(() => undefined)
}
