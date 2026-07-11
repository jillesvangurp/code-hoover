interface Env {
  QR_WALLET_KV: {
    get: (key: string, type: 'json') => Promise<StoredWallet | null>
    put: (key: string, value: string) => Promise<void>
  }
}

interface PagesContext {
  request: Request
  env: Env
  params: {
    walletId?: string | string[]
  }
}

interface WalletPayload {
  version: 1
  updatedAt: number
  iv: string
  ciphertext: string
}

interface StoredWallet {
  tokenHash: string
  payload: WalletPayload
}

const MAX_BODY_BYTES = 256 * 1024
const WALLET_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

function getWalletId(context: PagesContext): string | null {
  const value = context.params.walletId
  if (typeof value !== 'string' || !WALLET_ID_PATTERN.test(value)) return null
  return value
}

function getToken(request: Request): string | null {
  const token = request.headers.get('x-wallet-token')
  if (!token || !TOKEN_PATTERN.test(token)) return null
  return token
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

function parsePayload(value: unknown): WalletPayload | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (candidate.version !== 1) return null
  if (typeof candidate.updatedAt !== 'number' || !Number.isFinite(candidate.updatedAt)) return null
  if (typeof candidate.iv !== 'string' || !/^[A-Za-z0-9_-]{16}$/.test(candidate.iv)) return null
  if (typeof candidate.ciphertext !== 'string' || !/^[A-Za-z0-9_-]+$/.test(candidate.ciphertext)) return null
  return {
    version: 1,
    updatedAt: candidate.updatedAt,
    iv: candidate.iv,
    ciphertext: candidate.ciphertext,
  }
}

async function getStoredWallet(context: PagesContext, walletId: string): Promise<StoredWallet | null> {
  return context.env.QR_WALLET_KV.get(`wallet:${walletId}`, 'json')
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

async function authorize(request: Request, storedWallet: StoredWallet): Promise<boolean> {
  const token = getToken(request)
  if (!token) return false
  return safeEqual(await sha256Hex(token), storedWallet.tokenHash)
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const walletId = getWalletId(context)
  if (!walletId) return jsonResponse({ error: 'invalid_wallet' }, 400)
  const storedWallet = await getStoredWallet(context, walletId)
  if (!storedWallet) return jsonResponse({ error: 'not_found' }, 404)
  if (!await authorize(context.request, storedWallet)) return jsonResponse({ error: 'forbidden' }, 403)
  return jsonResponse(storedWallet.payload)
}

export async function onRequestPut(context: PagesContext): Promise<Response> {
  const walletId = getWalletId(context)
  if (!walletId) return jsonResponse({ error: 'invalid_wallet' }, 400)
  const token = getToken(context.request)
  if (!token) return jsonResponse({ error: 'forbidden' }, 403)
  const length = Number(context.request.headers.get('content-length') ?? '0')
  if (length > MAX_BODY_BYTES) return jsonResponse({ error: 'payload_too_large' }, 413)

  let requestBody: unknown
  try {
    requestBody = await readJsonBody(context.request)
  } catch (error) {
    if (error instanceof Error && error.message === 'Payload too large') return jsonResponse({ error: 'payload_too_large' }, 413)
    return jsonResponse({ error: 'invalid_json' }, 400)
  }

  const payload = parsePayload(requestBody)
  if (!payload) return jsonResponse({ error: 'invalid_payload' }, 400)

  const storedWallet = await getStoredWallet(context, walletId)
  if (storedWallet && !await authorize(context.request, storedWallet)) return jsonResponse({ error: 'forbidden' }, 403)

  await context.env.QR_WALLET_KV.put(`wallet:${walletId}`, JSON.stringify({
    tokenHash: storedWallet?.tokenHash ?? await sha256Hex(token),
    payload,
  } satisfies StoredWallet))

  return jsonResponse({ ok: true })
}

export function onRequestOptions(): Response {
  return new Response(null, { status: 204, headers: jsonHeaders })
}
