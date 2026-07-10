import { describe, expect, it } from 'vitest'
import { QR_DATA_TYPES, defaultDisplayName, parseSavedCodes, parseVCard, qrDataAsText, type VCardData } from './qr'

describe('saved code compatibility', () => {
  it('reads the Kotlin serialization wire format and restores blank names', () => {
    const codes = parseSavedCodes(JSON.stringify([
      {
        name: '',
        text: 'https://example.com',
        data: { type: 'qr.QrData.Url', url: 'https://example.com' },
      },
    ]))

    expect(codes).toEqual([
      {
        name: 'https://example.com',
        text: 'https://example.com',
        data: { type: QR_DATA_TYPES.url, url: 'https://example.com' },
      },
    ])
  })

  it('rejects malformed imports instead of partially replacing the stash', () => {
    expect(() => parseSavedCodes('{"not":"an array"}')).toThrow('Expected an array')
    expect(() => parseSavedCodes('[{"name":"broken"}]')).toThrow('Invalid saved code')
  })
})

describe('vCard support', () => {
  const card: VCardData = {
    type: QR_DATA_TYPES.vcard,
    name: 'Ada Lovelace',
    firstName: 'Ada',
    lastName: 'Lovelace',
    additionalNames: '',
    prefix: 'Countess',
    suffix: '',
    nickname: '',
    title: 'Programmer',
    organization: 'Analytical Engines',
    email: 'ada@example.com',
    emailType: 'internet',
    phone: '+44 123',
    phoneType: 'work',
    url: 'https://example.com/ada',
    street: '1 Engine Way',
    city: 'London',
    region: '',
    postalCode: 'N1',
    country: 'UK',
    note: 'First line\nSecond, line',
  }

  it('round-trips all supported contact fields', () => {
    const encoded = qrDataAsText(card)
    const parsed = parseVCard(encoded)

    expect(parsed).toEqual({ ...card, emailType: 'INTERNET', phoneType: 'WORK' })
    expect(encoded).toContain('NOTE:First line\\nSecond\\, line')
  })

  it('uses the same vCard display-name convention as the Kotlin app', () => {
    expect(defaultDisplayName(card)).toBe('Ada Lovelace vcard')
    expect(defaultDisplayName({ ...card, name: 'Ada vcard' })).toBe('Ada vcard')
  })

  it('unfolds folded vCard lines and accepts legacy TYPE parameters', () => {
    const parsed = parseVCard('BEGIN:VCARD\nVERSION:3.0\nFN:Ada\nNOTE:long\n value\nTEL;WORK:+44123\nEND:VCARD')
    expect(parsed?.note).toBe('longvalue')
    expect(parsed?.phoneType).toBe('WORK')
  })
})

describe('QR payloads', () => {
  it('keeps WiFi payload formatting compatible', () => {
    const wifi = { type: QR_DATA_TYPES.wifi, ssid: 'Guest', password: 'secret', encryption: 'WPA' } as const
    expect(qrDataAsText(wifi)).toBe('WIFI:T:WPA;S:Guest;P:secret;;')
    expect(defaultDisplayName(wifi)).toBe('Guest')
  })
})
