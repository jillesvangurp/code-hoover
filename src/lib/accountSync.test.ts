import { afterEach, describe, expect, it, vi } from 'vitest'
import { QR_DATA_TYPES, type SavedQrCode } from '../domain/qr'
import { encryptAccountWallet } from './accountCrypto'
import { createAccount, parseStoredAccountSession, signInAccount } from './accountSync'

const codes: SavedQrCode[] = [{
  name: 'Private note',
  text: 'do not upload this plaintext',
  data: { type: QR_DATA_TYPES.text, text: 'do not upload this plaintext' },
}]

afterEach(() => vi.unstubAllGlobals())

describe('encrypted account protocol', () => {
  it('registers with a verifier and ciphertext, never the password or readable codes', async () => {
    let requestBody = ''
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = String(init?.body)
      return new Response(JSON.stringify({ sessionToken: 't'.repeat(43), user: { email: 'user@example.com' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }))

    const result = await createAccount('user@example.com', 'correct horse battery staple', codes)
    const body = JSON.parse(requestBody) as Record<string, unknown>

    expect(result.codes).toEqual(codes)
    expect(body).not.toHaveProperty('password')
    expect(body).not.toHaveProperty('codes')
    expect(String(body.credential)).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(requestBody).not.toContain('correct horse')
    expect(requestBody).not.toContain('do not upload this plaintext')
  })

  it('decrypts a version 2 wallet only after authenticated sign-in', async () => {
    const { wallet } = await encryptAccountWallet('correct horse battery staple', codes)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      sessionToken: 't'.repeat(43),
      user: { email: 'user@example.com' },
      wallet,
    }), { status: 200, headers: { 'content-type': 'application/json' } })))

    await expect(signInAccount('user@example.com', 'correct horse battery staple')).resolves.toMatchObject({ codes })
    await expect(signInAccount('user@example.com', 'wrong password')).rejects.toThrow()
  })

  it('migrates a legacy plaintext wallet to ciphertext after one legacy sign-in', async () => {
    const requests: Array<{ path: string, body: string }> = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      const body = String(init?.body ?? '')
      requests.push({ path, body })
      if (requests.length === 1) return new Response(JSON.stringify({
        error: 'legacy_login_required',
        legacySalt: 'AAAAAAAAAAAAAAAAAAAAAA',
      }), { status: 428, headers: { 'content-type': 'application/json' } })
      if (requests.length === 2) return new Response(JSON.stringify({
        sessionToken: 't'.repeat(43),
        user: { email: 'legacy@example.com' },
        wallet: { version: 1, codes },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
    }))

    await expect(signInAccount('legacy@example.com', 'correct horse battery staple')).resolves.toMatchObject({ codes })

    expect(JSON.parse(requests[0].body)).toHaveProperty('credential')
    expect(JSON.parse(requests[0].body)).not.toHaveProperty('password')
    expect(JSON.parse(requests[1].body)).toHaveProperty('legacyCredential')
    expect(JSON.parse(requests[1].body)).not.toHaveProperty('password')
    expect(requests[1].body).not.toContain('correct horse')
    expect(requests[2].path).toBe('/api/account/migrate')
    expect(requests[2].body).not.toContain('correct horse')
    expect(requests[2].body).not.toContain('do not upload this plaintext')
  })

  it('invalidates pre-encryption stored sessions so they must migrate through password sign-in', () => {
    expect(parseStoredAccountSession(JSON.stringify({ token: 'legacy', email: 'user@example.com' }))).toBeNull()
    expect(parseStoredAccountSession(JSON.stringify({ token: 'new', email: 'user@example.com', cryptoVersion: 2 }))).toEqual({
      token: 'new', email: 'user@example.com', cryptoVersion: 2,
    })
  })
})
