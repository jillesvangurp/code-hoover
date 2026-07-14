interface Env {
  QR_WALLET_KV: {
    get: <T = unknown>(key: string, type: 'json') => Promise<T | null>
    put: (key: string, value: string) => Promise<void>
    delete: (key: string) => Promise<void>
  }
}

interface PagesContext {
  request: Request
  env: Env
  params: {
    route?: string | string[]
  }
}

interface AccountRecord {
  userId: string
  email: string
  passwordHash: string
  passwordSalt: string
  credentialVersion?: 1 | 2
  createdAt: number
  updatedAt: number
}

interface SessionRecord {
  userId: string
  createdAt: number
  expiresAt: number
}

interface LegacyWalletRecord {
  version: 1
  updatedAt: number
  codes: unknown[]
}

interface EncryptedWalletRecord {
  version: 2 | 3
  kdf: {
    name: 'PBKDF2'
    hash: 'SHA-256'
    iterations: number
    salt: string
  }
  cipher: {
    name: 'AES-GCM'
    iv: string
  }
  ciphertext: string
}

type WalletRecord = LegacyWalletRecord | EncryptedWalletRecord

const MAX_BODY_BYTES = 512 * 1024
const SESSION_DAYS = 90
const PBKDF2_ITERATIONS = 100_000
const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

function route(context: PagesContext): string {
  const value = context.params.route
  if (Array.isArray(value)) return value.join('/')
  return value ?? ''
}

function base64UrlEncode(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return null
  return email
}

function parseCredential(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null
}

function validBase64Url(value: unknown, byteLength?: number): value is string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) return false
  try {
    return byteLength === undefined || base64UrlDecode(value).byteLength === byteLength
  } catch {
    return false
  }
}

function parseEncryptedWallet(value: unknown): EncryptedWalletRecord | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  const kdf = candidate.kdf as Record<string, unknown> | undefined
  const cipher = candidate.cipher as Record<string, unknown> | undefined
  if ((candidate.version !== 2 && candidate.version !== 3) || !kdf || !cipher) return null
  if (kdf.name !== 'PBKDF2' || kdf.hash !== 'SHA-256' || !Number.isInteger(kdf.iterations)) return null
  const iterations = Number(kdf.iterations)
  if (iterations < 100_000 || iterations > 1_000_000 || !validBase64Url(kdf.salt, 16)) return null
  if (cipher.name !== 'AES-GCM' || !validBase64Url(cipher.iv, 12)) return null
  if (!validBase64Url(candidate.ciphertext) || candidate.ciphertext.length < 22 || candidate.ciphertext.length > 500_000) return null
  return {
    version: candidate.version,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: kdf.salt },
    cipher: { name: 'AES-GCM', iv: cipher.iv },
    ciphertext: candidate.ciphertext,
  }
}

function randomId(bytes = 16): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(bytes)))
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let diff = 0
  for (let index = 0; index < left.length; index += 1) diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return diff === 0
}

async function passwordHash(password: string, salt: string): Promise<string> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: toArrayBuffer(base64UrlDecode(salt)), iterations: PBKDF2_ITERATIONS },
    material,
    256,
  )
  return base64UrlEncode(new Uint8Array(bits))
}

async function emailKey(email: string): Promise<string> {
  return `account:email:${await sha256Hex(email)}`
}

function accountKey(userId: string): string {
  return `account:user:${userId}`
}

function legacyWalletKey(userId: string): string {
  return `account-wallet:${userId}`
}

function encryptedWalletKey(userId: string): string {
  return `account-wallet-v2:${userId}`
}

async function accountWallet(context: PagesContext, account: AccountRecord): Promise<WalletRecord | null> {
  if ((account.credentialVersion ?? 1) === 1) {
    return context.env.QR_WALLET_KV.get<WalletRecord>(legacyWalletKey(account.userId), 'json')
  }

  const encrypted = await context.env.QR_WALLET_KV.get<WalletRecord>(encryptedWalletKey(account.userId), 'json')
  if (encrypted) {
    await context.env.QR_WALLET_KV.delete(legacyWalletKey(account.userId))
    return encrypted
  }

  const legacy = await context.env.QR_WALLET_KV.get<WalletRecord>(legacyWalletKey(account.userId), 'json')
  if (legacy?.version === 2 || legacy?.version === 3) {
    await context.env.QR_WALLET_KV.put(encryptedWalletKey(account.userId), JSON.stringify(legacy))
    await context.env.QR_WALLET_KV.delete(legacyWalletKey(account.userId))
  }
  return legacy
}

async function sessionKey(token: string): Promise<string> {
  return `account-session:${await sha256Hex(token)}`
}

async function readJsonBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader()
  if (!reader) throw new Error('Missing body')
  const chunks: Uint8Array[] = []
  let bytesRead = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    bytesRead += value.byteLength
    if (bytesRead > MAX_BODY_BYTES) throw new Error('Payload too large')
    chunks.push(value)
  }
  const body = new Uint8Array(bytesRead)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder().decode(body))
}

async function createSession(context: PagesContext, userId: string): Promise<string> {
  const token = randomId(32)
  const now = Date.now()
  await context.env.QR_WALLET_KV.put(await sessionKey(token), JSON.stringify({
    userId,
    createdAt: now,
    expiresAt: now + SESSION_DAYS * 24 * 60 * 60 * 1000,
  } satisfies SessionRecord))
  return token
}

function bearerToken(request: Request): string | null {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get('authorization') ?? '')
  return match?.[1] ?? null
}

async function authenticate(context: PagesContext): Promise<{ token: string, account: AccountRecord } | Response> {
  const token = bearerToken(context.request)
  if (!token) return jsonResponse({ error: 'unauthorized' }, 401)
  const key = await sessionKey(token)
  const session = await context.env.QR_WALLET_KV.get<SessionRecord>(key, 'json')
  if (!session || session.expiresAt < Date.now()) {
    if (session) await context.env.QR_WALLET_KV.delete(key)
    return jsonResponse({ error: 'unauthorized' }, 401)
  }
  const account = await context.env.QR_WALLET_KV.get<AccountRecord>(accountKey(session.userId), 'json')
  if (!account) return jsonResponse({ error: 'unauthorized' }, 401)
  return { token, account }
}

function userResponse(account: AccountRecord): { user: { id: string, email: string } } {
  return { user: { id: account.userId, email: account.email } }
}

async function register(context: PagesContext): Promise<Response> {
  const body = await readJsonBody(context.request) as Record<string, unknown>
  const email = normalizeEmail(body.email)
  const credential = parseCredential(body.credential)
  const wallet = parseEncryptedWallet(body.wallet)
  if (!email || !credential || !wallet) return jsonResponse({ error: 'invalid_account' }, 400)

  const indexKey = await emailKey(email)
  if (await context.env.QR_WALLET_KV.get(indexKey, 'json')) return jsonResponse({ error: 'account_exists' }, 409)

  const now = Date.now()
  const userId = randomId()
  const passwordSalt = randomId(16)
  const account: AccountRecord = {
    userId,
    email,
    passwordSalt,
    passwordHash: await passwordHash(credential, passwordSalt),
    credentialVersion: 2,
    createdAt: now,
    updatedAt: now,
  }
  await context.env.QR_WALLET_KV.put(accountKey(userId), JSON.stringify(account))
  await context.env.QR_WALLET_KV.put(indexKey, JSON.stringify({ userId }))
  await context.env.QR_WALLET_KV.put(encryptedWalletKey(userId), JSON.stringify(wallet))

  return jsonResponse({ ...userResponse(account), sessionToken: await createSession(context, userId) })
}

async function login(context: PagesContext): Promise<Response> {
  const body = await readJsonBody(context.request) as Record<string, unknown>
  const email = normalizeEmail(body.email)
  if (!email) return jsonResponse({ error: 'invalid_login' }, 400)

  const index = await context.env.QR_WALLET_KV.get<{ userId: string }>(await emailKey(email), 'json')
  const account = index ? await context.env.QR_WALLET_KV.get<AccountRecord>(accountKey(index.userId), 'json') : null
  if (!account) return jsonResponse({ error: 'invalid_login' }, 401)

  const credentialVersion = account.credentialVersion ?? 1
  if (credentialVersion === 1 && body.credential !== undefined) {
    return jsonResponse({ error: 'legacy_login_required', legacySalt: account.passwordSalt }, 428)
  }
  const suppliedSecret = credentialVersion === 2 ? parseCredential(body.credential) : parseCredential(body.legacyCredential)
  const suppliedHash = credentialVersion === 2 && suppliedSecret
    ? await passwordHash(suppliedSecret, account.passwordSalt)
    : suppliedSecret
  if (!suppliedHash || !safeEqual(suppliedHash, account.passwordHash)) {
    return jsonResponse({ error: 'invalid_login' }, 401)
  }

  const wallet = await accountWallet(context, account)
  return jsonResponse({ ...userResponse(account), sessionToken: await createSession(context, account.userId), wallet })
}

async function migrate(context: PagesContext): Promise<Response> {
  const auth = await authenticate(context)
  if (auth instanceof Response) return auth
  if ((auth.account.credentialVersion ?? 1) !== 1) return jsonResponse({ error: 'already_migrated' }, 409)
  const body = await readJsonBody(context.request) as Record<string, unknown>
  const credential = parseCredential(body.credential)
  const wallet = parseEncryptedWallet(body.wallet)
  if (!credential || !wallet) return jsonResponse({ error: 'invalid_migration' }, 400)

  const passwordSalt = randomId(16)
  const migrated: AccountRecord = {
    ...auth.account,
    passwordSalt,
    passwordHash: await passwordHash(credential, passwordSalt),
    credentialVersion: 2,
    updatedAt: Date.now(),
  }
  await context.env.QR_WALLET_KV.put(encryptedWalletKey(auth.account.userId), JSON.stringify(wallet))
  await context.env.QR_WALLET_KV.put(accountKey(auth.account.userId), JSON.stringify(migrated))
  await context.env.QR_WALLET_KV.delete(legacyWalletKey(auth.account.userId))
  return jsonResponse({ ok: true })
}

async function getMe(context: PagesContext): Promise<Response> {
  const auth = await authenticate(context)
  if (auth instanceof Response) return auth
  return jsonResponse(userResponse(auth.account))
}

async function getWallet(context: PagesContext): Promise<Response> {
  const auth = await authenticate(context)
  if (auth instanceof Response) return auth
  const wallet = await accountWallet(context, auth.account)
  if (wallet?.version === 1) return jsonResponse({ error: 'wallet_reauthentication_required' }, 428)
  return jsonResponse({ wallet })
}

async function putWallet(context: PagesContext): Promise<Response> {
  const auth = await authenticate(context)
  if (auth instanceof Response) return auth
  if ((auth.account.credentialVersion ?? 1) !== 2) return jsonResponse({ error: 'migration_required' }, 428)
  const body = await readJsonBody(context.request) as Record<string, unknown>
  const wallet = parseEncryptedWallet(body.wallet)
  if (!wallet) return jsonResponse({ error: 'invalid_encrypted_wallet' }, 400)
  const current = await context.env.QR_WALLET_KV.get<WalletRecord>(encryptedWalletKey(auth.account.userId), 'json')
  if (current?.version === 3 && wallet.version === 2) return jsonResponse({ error: 'wallet_upgrade_required' }, 409)
  await context.env.QR_WALLET_KV.put(encryptedWalletKey(auth.account.userId), JSON.stringify(wallet))
  await context.env.QR_WALLET_KV.delete(legacyWalletKey(auth.account.userId))
  return jsonResponse({ ok: true })
}

async function logout(context: PagesContext): Promise<Response> {
  const token = bearerToken(context.request)
  if (token) await context.env.QR_WALLET_KV.delete(await sessionKey(token))
  return jsonResponse({ ok: true })
}

async function deleteAccount(context: PagesContext): Promise<Response> {
  const auth = await authenticate(context)
  if (auth instanceof Response) return auth
  await context.env.QR_WALLET_KV.delete(await sessionKey(auth.token))
  await context.env.QR_WALLET_KV.delete(encryptedWalletKey(auth.account.userId))
  await context.env.QR_WALLET_KV.delete(legacyWalletKey(auth.account.userId))
  await context.env.QR_WALLET_KV.delete(await emailKey(auth.account.email))
  await context.env.QR_WALLET_KV.delete(accountKey(auth.account.userId))
  return jsonResponse({ ok: true })
}

async function handle(context: PagesContext): Promise<Response> {
  try {
    const path = route(context)
    if (context.request.method === 'POST' && path === 'register') return register(context)
    if (context.request.method === 'POST' && path === 'login') return login(context)
    if (context.request.method === 'POST' && path === 'migrate') return migrate(context)
    if (context.request.method === 'POST' && path === 'logout') return logout(context)
    if (context.request.method === 'GET' && path === 'me') return getMe(context)
    if (context.request.method === 'DELETE' && path === 'me') return deleteAccount(context)
    if (context.request.method === 'GET' && path === 'wallet') return getWallet(context)
    if (context.request.method === 'PUT' && path === 'wallet') return putWallet(context)
    return jsonResponse({ error: 'not_found' }, 404)
  } catch (error) {
    if (error instanceof Error && error.message === 'Payload too large') return jsonResponse({ error: 'payload_too_large' }, 413)
    return jsonResponse({ error: 'invalid_request' }, 400)
  }
}

export const onRequestGet = handle
export const onRequestPost = handle
export const onRequestPut = handle
export const onRequestDelete = handle

export function onRequestOptions(): Response {
  return new Response(null, { status: 204, headers: jsonHeaders })
}
