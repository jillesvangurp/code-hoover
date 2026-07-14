import { describe, expect, it } from 'vitest'
import { QR_DATA_TYPES, type SavedQrCode } from '../domain/qr'
import { decryptAccountWallet, deriveAccountCredential, encryptAccountWallet, parseEncryptedAccountWallet } from './accountCrypto'

const codes: SavedQrCode[] = [{
  name: 'Secret office Wi-Fi',
  text: 'WIFI:T:WPA;S:Formation;P:very-secret;;',
  data: { type: QR_DATA_TYPES.wifi, ssid: 'Formation', password: 'very-secret', encryption: 'WPA' },
}]

describe('account wallet encryption', () => {
  it('round-trips saved codes through an authenticated ciphertext envelope', async () => {
    const { wallet } = await encryptAccountWallet('correct horse battery staple', codes)

    expect(JSON.stringify(wallet)).not.toContain('very-secret')
    expect(wallet.version).toBe(3)
    expect(wallet.kdf.iterations).toBeGreaterThanOrEqual(600_000)
    await expect(decryptAccountWallet('correct horse battery staple', wallet)).resolves.toMatchObject({ codes })
  })

  it('encrypts and restores deletion tombstones without exposing their payload', async () => {
    const records: SavedQrCode[] = [{
      ...codes[0], id: 'deleted-code', revision: 2,
      updatedAt: '2026-07-12T10:00:00.000Z', deletedAt: '2026-07-12T10:00:00.000Z',
    }]
    const { wallet } = await encryptAccountWallet('correct horse battery staple', records)

    expect(JSON.stringify(wallet)).not.toContain('very-secret')
    await expect(decryptAccountWallet('correct horse battery staple', wallet)).resolves.toMatchObject({ codes: records })
  })

  it('rejects a wrong password and tampered ciphertext', async () => {
    const { wallet } = await encryptAccountWallet('correct horse battery staple', codes)
    await expect(decryptAccountWallet('wrong password', wallet)).rejects.toThrow()

    const last = wallet.ciphertext.at(-1) === 'A' ? 'B' : 'A'
    await expect(decryptAccountWallet('correct horse battery staple', {
      ...wallet,
      ciphertext: `${wallet.ciphertext.slice(0, -1)}${last}`,
    })).rejects.toThrow()
  })

  it('reads existing version 2 ciphertext before rewriting it as version 3', async () => {
    const { wallet } = await encryptAccountWallet('correct horse battery staple', codes)
    await expect(decryptAccountWallet('correct horse battery staple', { ...wallet, version: 2 })).resolves.toMatchObject({ codes })
  })

  it('derives deterministic, email-bound authentication credentials without exposing the password', async () => {
    const first = await deriveAccountCredential('User@Example.com', 'correct horse battery staple')
    const same = await deriveAccountCredential('user@example.com', 'correct horse battery staple')
    const other = await deriveAccountCredential('other@example.com', 'correct horse battery staple')

    expect(first).toBe(same)
    expect(first).not.toBe(other)
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(first).not.toContain('correct')
  })

  it('bounds server-controlled KDF work before deriving a key', () => {
    expect(() => parseEncryptedAccountWallet({
      version: 2,
      kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 10_000_000, salt: 'AAAAAAAAAAAAAAAAAAAAAA' },
      cipher: { name: 'AES-GCM', iv: 'AAAAAAAAAAAAAAAA' },
      ciphertext: 'AAAAAAAAAAAAAAAAAAAAAA',
    })).toThrow('Invalid encrypted wallet')
  })
})
