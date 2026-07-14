import { describe, expect, it } from 'vitest'
import { onRequestPost, onRequestPut } from '../../functions/api/account/[[route]]'
import { QR_DATA_TYPES, type SavedQrCode } from '../domain/qr'
import { deriveAccountCredential, encryptAccountWallet } from './accountCrypto'

class MemoryKv {
  readonly values = new Map<string, string>()

  async get<T>(key: string): Promise<T | null> {
    const value = this.values.get(key)
    return value ? JSON.parse(value) as T : null
  }

  async put(key: string, value: string): Promise<void> {
    this.values.set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key)
  }
}

const codes: SavedQrCode[] = [{
  name: 'Private note',
  text: 'server must never see this',
  data: { type: QR_DATA_TYPES.text, text: 'server must never see this' },
}]

function context(kv: MemoryKv, route: string, body: unknown, authorization?: string) {
  return {
    request: new Request(`https://example.test/api/account/${route}`, {
      method: route === 'wallet' ? 'PUT' : 'POST',
      headers: {
        'content-type': 'application/json',
        ...(authorization ? { authorization } : {}),
      },
      body: JSON.stringify(body),
    }),
    env: { QR_WALLET_KV: kv },
    params: { route },
  }
}

describe('account API ciphertext boundary', () => {
  it('stores only a validated version 3 envelope and rejects plaintext wallet writes', async () => {
    const kv = new MemoryKv()
    const password = 'correct horse battery staple'
    const email = 'user@example.com'
    const [{ wallet }, credential] = await Promise.all([
      encryptAccountWallet(password, codes),
      deriveAccountCredential(email, password),
    ])

    const registration = await onRequestPost(context(kv, 'register', { email, credential, wallet }))
    expect(registration.status).toBe(200)
    const response = await registration.json() as { sessionToken: string }
    const storedWallet = [...kv.values.entries()].find(([key]) => key.startsWith('account-wallet-v2:'))?.[1]
    expect(storedWallet).toContain('"version":3')
    expect(storedWallet).not.toContain('server must never see this')
    expect([...kv.values.keys()].some((key) => key.startsWith('account-wallet:'))).toBe(false)

    const plaintextWrite = await onRequestPut(context(
      kv,
      'wallet',
      { codes },
      `Bearer ${response.sessionToken}`,
    ))
    expect(plaintextWrite.status).toBe(400)

    const downgradeWrite = await onRequestPut(context(
      kv,
      'wallet',
      { wallet: { ...wallet, version: 2 } },
      `Bearer ${response.sessionToken}`,
    ))
    expect(downgradeWrite.status).toBe(409)
  })

  it('isolates encrypted wallets from writes made through a legacy deployment', async () => {
    const kv = new MemoryKv()
    const password = 'correct horse battery staple'
    const email = 'user@example.com'
    const [{ wallet }, credential] = await Promise.all([
      encryptAccountWallet(password, codes),
      deriveAccountCredential(email, password),
    ])

    const registration = await onRequestPost(context(kv, 'register', { email, credential, wallet }))
    expect(registration.status).toBe(200)
    const encryptedEntry = [...kv.values.entries()].find(([key]) => key.startsWith('account-wallet-v2:'))
    expect(encryptedEntry).toBeDefined()
    const userId = encryptedEntry?.[0].slice('account-wallet-v2:'.length) ?? ''
    await kv.put(`account-wallet:${userId}`, JSON.stringify({ version: 1, updatedAt: Date.now(), codes }))

    const login = await onRequestPost(context(kv, 'login', { email, credential }))
    expect(login.status).toBe(200)
    const loginBody = await login.json() as { wallet: { version: number, ciphertext?: string } }

    expect(loginBody.wallet.version).toBe(3)
    expect(loginBody.wallet.ciphertext).toBe(wallet.ciphertext)
    expect(kv.values.has(`account-wallet:${userId}`)).toBe(false)
    expect(kv.values.get(`account-wallet-v2:${userId}`)).not.toContain('server must never see this')
  })

  it('promotes an existing encrypted wallet out of the legacy key', async () => {
    const kv = new MemoryKv()
    const password = 'correct horse battery staple'
    const email = 'user@example.com'
    const [{ wallet }, credential] = await Promise.all([
      encryptAccountWallet(password, codes),
      deriveAccountCredential(email, password),
    ])

    const registration = await onRequestPost(context(kv, 'register', { email, credential, wallet }))
    expect(registration.status).toBe(200)
    const encryptedEntry = [...kv.values.entries()].find(([key]) => key.startsWith('account-wallet-v2:'))
    const userId = encryptedEntry?.[0].slice('account-wallet-v2:'.length) ?? ''
    kv.values.delete(`account-wallet-v2:${userId}`)
    await kv.put(`account-wallet:${userId}`, JSON.stringify(wallet))

    const login = await onRequestPost(context(kv, 'login', { email, credential }))

    expect(login.status).toBe(200)
    expect(kv.values.get(`account-wallet-v2:${userId}`)).toBe(JSON.stringify(wallet))
    expect(kv.values.has(`account-wallet:${userId}`)).toBe(false)
  })
})
