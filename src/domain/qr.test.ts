import { describe, expect, it } from 'vitest'
import { QR_DATA_TYPES, defaultDisplayName, mergeSavedCodes, parseQrPayload, parseSavedCodes, parseVCard, qrDataAsText, type SavedQrCode, type VCardData } from './qr'

describe('saved code compatibility', () => {
  it('reads the legacy serialization format and restores blank names', () => {
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

  it('preserves optional creation metadata when present', () => {
    const codes = parseSavedCodes(JSON.stringify([
      {
        name: 'Example',
        text: 'https://example.com',
        createdAt: '2026-07-12T09:00:00.000Z',
        data: { type: QR_DATA_TYPES.url, url: 'https://example.com' },
      },
    ]))

    expect(codes[0].createdAt).toBe('2026-07-12T09:00:00.000Z')
  })

  it('merges account sync lists by payload without dropping either device', () => {
    const laptop: SavedQrCode[] = [
      { name: 'Laptop', text: 'https://laptop.example', data: { type: QR_DATA_TYPES.url, url: 'https://laptop.example' } },
      { name: 'Renamed shared', text: 'shared', data: { type: QR_DATA_TYPES.text, text: 'shared' } },
    ]
    const mobile: SavedQrCode[] = [
      { name: 'Shared', text: 'shared', data: { type: QR_DATA_TYPES.text, text: 'shared' } },
      { name: 'Mobile', text: '5901234123457', data: { type: QR_DATA_TYPES.barcode, format: 'EAN_13', text: '5901234123457' } },
    ]

    expect(mergeSavedCodes(laptop, mobile)).toEqual([
      laptop[0],
      laptop[1],
      mobile[1],
    ])
  })

  it('keeps creation metadata from a duplicate sync copy when the local copy lacks it', () => {
    const merged = mergeSavedCodes(
      [{ name: 'Local', text: 'shared', data: { type: QR_DATA_TYPES.text, text: 'shared' } }],
      [{ name: 'Remote', text: 'shared', createdAt: '2026-07-12T09:00:00.000Z', data: { type: QR_DATA_TYPES.text, text: 'shared' } }],
    )

    expect(merged[0].createdAt).toBe('2026-07-12T09:00:00.000Z')
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

  it('preserves the legacy vCard display-name convention', () => {
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

  it('preserves scanned barcode format metadata', () => {
    const codes = parseSavedCodes(JSON.stringify([
      {
        name: '',
        text: '5901234123457',
        data: { type: QR_DATA_TYPES.barcode, format: 'EAN_13', text: '5901234123457' },
      },
    ]))

    expect(codes[0]).toEqual({
      name: '5901234123457',
      text: '5901234123457',
      data: { type: QR_DATA_TYPES.barcode, format: 'EAN_13', text: '5901234123457' },
    })
    expect(defaultDisplayName(codes[0].data)).toBe('5901234123457')
    expect(qrDataAsText(codes[0].data)).toBe('5901234123457')
  })

  it('formats common action payloads as QR-friendly URIs', () => {
    expect(qrDataAsText({ type: QR_DATA_TYPES.email, email: 'hello@example.com', subject: 'Hi there', body: 'Line one' })).toBe('mailto:hello@example.com?subject=Hi+there&body=Line+one')
    expect(qrDataAsText({ type: QR_DATA_TYPES.phone, phone: '+4912345' })).toBe('tel:+4912345')
    expect(qrDataAsText({ type: QR_DATA_TYPES.sms, phone: '+4912345', message: 'Ping me' })).toBe('sms:+4912345?body=Ping+me')
  })

  it('uses Google Maps search URLs for location payloads', () => {
    expect(qrDataAsText({
      type: QR_DATA_TYPES.location,
      label: 'FORMATION office',
      query: '',
      latitude: '52.5200',
      longitude: '13.4050',
    })).toBe('https://www.google.com/maps/search/?api=1&query=52.5200%2C13.4050')

    expect(qrDataAsText({
      type: QR_DATA_TYPES.location,
      label: '',
      query: 'FORMATION Berlin',
      latitude: '',
      longitude: '',
    })).toBe('https://www.google.com/maps/search/?api=1&query=FORMATION+Berlin')
  })

  it('parses common action, map, and event payloads into structured data', () => {
    expect(parseQrPayload('mailto:hello@example.com?subject=Hi+there&body=Line+one')).toEqual({
      type: QR_DATA_TYPES.email,
      email: 'hello@example.com',
      subject: 'Hi there',
      body: 'Line one',
    })
    expect(parseQrPayload('tel:+4912345')).toEqual({ type: QR_DATA_TYPES.phone, phone: '+4912345' })
    expect(parseQrPayload('sms:+4912345?body=Ping+me')).toEqual({ type: QR_DATA_TYPES.sms, phone: '+4912345', message: 'Ping me' })
    expect(parseQrPayload('geo:52.5200,13.4050?q=52.5200%2C13.4050%28FORMATION+office%29')).toMatchObject({
      type: QR_DATA_TYPES.location,
      label: 'FORMATION office',
      latitude: '52.5200',
      longitude: '13.4050',
    })
    expect(parseQrPayload('BEGIN:VEVENT\nSUMMARY:Demo\nDTSTART:20260712T120000\nLOCATION:Berlin\nEND:VEVENT')).toEqual({
      type: QR_DATA_TYPES.event,
      title: 'Demo',
      start: '20260712T120000',
      end: '',
      location: 'Berlin',
      description: '',
    })
  })
})
