import { parseSavedCodes, type SavedQrCode } from '../domain/qr'

const API_PREFIX = '/api/account'

export interface AccountSession {
  token: string
  email: string
}

export interface AccountResult {
  session: AccountSession
  codes: SavedQrCode[]
}

interface AccountApiResponse {
  sessionToken: string
  user: {
    email: string
  }
  codes?: unknown
}

function parseAccountSession(value: unknown): AccountSession | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (typeof candidate.token !== 'string' || typeof candidate.email !== 'string') return null
  return { token: candidate.token, email: candidate.email }
}

export function parseStoredAccountSession(value: string): AccountSession | null {
  return parseAccountSession(JSON.parse(value))
}

function parseAccountResult(value: AccountApiResponse): AccountResult {
  return {
    session: { token: value.sessionToken, email: value.user.email },
    codes: value.codes ? parseSavedCodes(JSON.stringify(value.codes)) : [],
  }
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

async function readAccountResult(response: Response): Promise<AccountResult> {
  if (!response.ok) throw new Error(`Account request failed: ${response.status}`)
  return parseAccountResult(await response.json() as AccountApiResponse)
}

export async function createAccount(email: string, password: string, codes: SavedQrCode[]): Promise<AccountResult> {
  return readAccountResult(await accountRequest('register', {
    method: 'POST',
    body: JSON.stringify({ email, password, codes }),
  }))
}

export async function signInAccount(email: string, password: string): Promise<AccountResult> {
  return readAccountResult(await accountRequest('login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }))
}

export async function signOutAccount(session: AccountSession): Promise<void> {
  await accountRequest('logout', { method: 'POST' }, session)
}

export async function deleteAccount(session: AccountSession): Promise<void> {
  const response = await accountRequest('me', { method: 'DELETE' }, session)
  if (!response.ok) throw new Error(`Account delete failed: ${response.status}`)
}

export async function downloadAccountCodes(session: AccountSession): Promise<SavedQrCode[]> {
  const response = await accountRequest('wallet', undefined, session)
  if (!response.ok) throw new Error(`Account restore failed: ${response.status}`)
  const body = await response.json() as { codes?: unknown }
  return parseSavedCodes(JSON.stringify(body.codes ?? []))
}

export async function uploadAccountCodes(session: AccountSession, codes: SavedQrCode[]): Promise<SavedQrCode[]> {
  const response = await accountRequest('wallet', {
    method: 'PUT',
    body: JSON.stringify({ codes }),
  }, session)
  if (!response.ok) throw new Error(`Account sync failed: ${response.status}`)
  const body = await response.json() as { codes?: unknown }
  return parseSavedCodes(JSON.stringify(body.codes ?? codes))
}
