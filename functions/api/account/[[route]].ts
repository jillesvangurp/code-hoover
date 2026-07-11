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
  createdAt: number
  updatedAt: number
}

interface SessionRecord {
  userId: string
  createdAt: number
  expiresAt: number
}

interface WalletRecord {
  version: 1
  updatedAt: number
  codes: unknown[]
}

const MAX_BODY_BYTES = 256 * 1024
const PASSWORD_MIN_LENGTH = 8
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

function parsePassword(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN_LENGTH || value.length > 256) return null
  return value
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
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return diff === 0
}

async function passwordHash(password: string, salt: string): Promise<string> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
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

function walletKey(userId: string): string {
  return `account-wallet:${userId}`
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

function parseCodes(value: unknown): unknown[] | null {
  if (!Array.isArray(value)) return null
  if (JSON.stringify(value).length > MAX_BODY_BYTES) return null
  return value
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
  const header = request.headers.get('authorization')
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(header ?? '')
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
  const password = parsePassword(body.password)
  const codes = parseCodes(body.codes ?? [])
  if (!email || !password || !codes) return jsonResponse({ error: 'invalid_account' }, 400)

  const indexKey = await emailKey(email)
  if (await context.env.QR_WALLET_KV.get(indexKey, 'json')) return jsonResponse({ error: 'account_exists' }, 409)

  const now = Date.now()
  const userId = randomId()
  const passwordSalt = randomId(16)
  const account: AccountRecord = {
    userId,
    email,
    passwordSalt,
    passwordHash: await passwordHash(password, passwordSalt),
    createdAt: now,
    updatedAt: now,
  }
  await context.env.QR_WALLET_KV.put(accountKey(userId), JSON.stringify(account))
  await context.env.QR_WALLET_KV.put(indexKey, JSON.stringify({ userId }))
  await context.env.QR_WALLET_KV.put(walletKey(userId), JSON.stringify({ version: 1, updatedAt: now, codes } satisfies WalletRecord))

  return jsonResponse({ ...userResponse(account), sessionToken: await createSession(context, userId), codes })
}

async function login(context: PagesContext): Promise<Response> {
  const body = await readJsonBody(context.request) as Record<string, unknown>
  const email = normalizeEmail(body.email)
  const password = parsePassword(body.password)
  if (!email || !password) return jsonResponse({ error: 'invalid_login' }, 400)

  const index = await context.env.QR_WALLET_KV.get<{ userId: string }>(await emailKey(email), 'json')
  const account = index ? await context.env.QR_WALLET_KV.get<AccountRecord>(accountKey(index.userId), 'json') : null
  if (!account) return jsonResponse({ error: 'invalid_login' }, 401)
  if (!safeEqual(await passwordHash(password, account.passwordSalt), account.passwordHash)) {
    return jsonResponse({ error: 'invalid_login' }, 401)
  }

  const wallet = await context.env.QR_WALLET_KV.get<WalletRecord>(walletKey(account.userId), 'json')
  return jsonResponse({ ...userResponse(account), sessionToken: await createSession(context, account.userId), codes: wallet?.codes ?? [] })
}

async function getMe(context: PagesContext): Promise<Response> {
  const auth = await authenticate(context)
  if (auth instanceof Response) return auth
  return jsonResponse(userResponse(auth.account))
}

async function getWallet(context: PagesContext): Promise<Response> {
  const auth = await authenticate(context)
  if (auth instanceof Response) return auth
  const wallet = await context.env.QR_WALLET_KV.get<WalletRecord>(walletKey(auth.account.userId), 'json')
  return jsonResponse({ codes: wallet?.codes ?? [], updatedAt: wallet?.updatedAt ?? 0 })
}

async function putWallet(context: PagesContext): Promise<Response> {
  const auth = await authenticate(context)
  if (auth instanceof Response) return auth
  const body = await readJsonBody(context.request) as Record<string, unknown>
  const codes = parseCodes(body.codes)
  if (!codes) return jsonResponse({ error: 'invalid_codes' }, 400)
  await context.env.QR_WALLET_KV.put(walletKey(auth.account.userId), JSON.stringify({ version: 1, updatedAt: Date.now(), codes } satisfies WalletRecord))
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
  await context.env.QR_WALLET_KV.delete(walletKey(auth.account.userId))
  await context.env.QR_WALLET_KV.delete(await emailKey(auth.account.email))
  await context.env.QR_WALLET_KV.delete(accountKey(auth.account.userId))
  return jsonResponse({ ok: true })
}

async function handle(context: PagesContext): Promise<Response> {
  try {
    const path = route(context)
    if (context.request.method === 'POST' && path === 'register') return register(context)
    if (context.request.method === 'POST' && path === 'login') return login(context)
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
