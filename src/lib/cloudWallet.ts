import { parseSavedCodes, type SavedQrCode } from '../domain/qr'

const WALLET_PREFIX = 'qrw1'
const KEY_BYTES = 32
const ID_BYTES = 16
const IV_BYTES = 12
const API_PREFIX = '/api/wallet'

interface ParsedCloudWalletKey {
  id: string
  secret: Uint8Array
}

interface EncryptedWalletPayload {
  version: 1
  updatedAt: number
  iv: string
  ciphertext: string
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

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
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

async function importAesKey(secret: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', toArrayBuffer(secret), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function authToken(secret: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(`qr-wallet-auth:${base64UrlEncode(secret)}`))
  return base64UrlEncode(new Uint8Array(digest))
}

function parseCloudWalletKey(walletKey: string): ParsedCloudWalletKey {
  const parts = walletKey.trim().split('.')
  if (parts.length !== 3 || parts[0] !== WALLET_PREFIX || !/^[A-Za-z0-9_-]{22}$/.test(parts[1])) {
    throw new Error('Invalid cloud wallet key')
  }
  const secret = base64UrlDecode(parts[2])
  if (secret.byteLength !== KEY_BYTES) throw new Error('Invalid cloud wallet key')
  return { id: parts[1], secret }
}

async function encryptCodes(codes: SavedQrCode[], secret: Uint8Array): Promise<EncryptedWalletPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await importAesKey(secret)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(JSON.stringify(codes)))
  return {
    version: 1,
    updatedAt: Date.now(),
    iv: base64UrlEncode(iv),
    ciphertext: base64UrlEncode(new Uint8Array(encrypted)),
  }
}

async function decryptCodes(payload: EncryptedWalletPayload, secret: Uint8Array): Promise<SavedQrCode[]> {
  const key = await importAesKey(secret)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(base64UrlDecode(payload.iv)) },
    key,
    toArrayBuffer(base64UrlDecode(payload.ciphertext)),
  )
  return parseSavedCodes(textDecoder.decode(decrypted))
}

async function walletRequest(walletKey: string, init?: RequestInit): Promise<Response> {
  const parsed = parseCloudWalletKey(walletKey)
  const token = await authToken(parsed.secret)
  return fetch(`${API_PREFIX}/${parsed.id}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-wallet-token': token,
      ...init?.headers,
    },
  })
}

export function createCloudWalletKey(): string {
  const idBytes = crypto.getRandomValues(new Uint8Array(ID_BYTES))
  const secret = crypto.getRandomValues(new Uint8Array(KEY_BYTES))
  return `${WALLET_PREFIX}.${base64UrlEncode(idBytes)}.${base64UrlEncode(secret)}`
}

export function cloudWalletLabel(walletKey: string): string {
  try {
    return parseCloudWalletKey(walletKey).id.slice(0, 8)
  } catch {
    return ''
  }
}

export async function uploadCloudWallet(walletKey: string, codes: SavedQrCode[]): Promise<void> {
  const parsed = parseCloudWalletKey(walletKey)
  const payload = await encryptCodes(codes, parsed.secret)
  const response = await walletRequest(walletKey, { method: 'PUT', body: JSON.stringify(payload) })
  if (!response.ok) throw new Error(`Cloud upload failed: ${response.status}`)
}

export async function downloadCloudWallet(walletKey: string): Promise<SavedQrCode[]> {
  const parsed = parseCloudWalletKey(walletKey)
  const response = await walletRequest(walletKey)
  if (response.status === 404) return []
  if (!response.ok) throw new Error(`Cloud restore failed: ${response.status}`)
  return decryptCodes(await response.json() as EncryptedWalletPayload, parsed.secret)
}

export function isCloudWalletKey(value: string): boolean {
  try {
    parseCloudWalletKey(value)
    return true
  } catch {
    return false
  }
}
