import { describe, expect, it } from 'vitest'
import { QR_DATA_TYPES, activeSavedCodes, defaultDisplayName, mergeSavedCodes, parseQrPayload, parseSavedCodes, parseVCard, qrDataAsText, reconcileSavedCodes, savedCodeMatchesPayload, serializePersistentSavedCodes, syncableSavedCodes, type SavedQrCode, type VCardData } from './qr'

describe('saved code compatibility', () => {
  it('reads the legacy serialization format and restores blank names', () => {
    const codes = parseSavedCodes(JSON.stringify([
      {
        name: '',
        text: 'https://example.com',
        data: { type: 'qr.QrData.Url', url: 'https://example.com' },
      },
    ]))

    expect(codes[0]).toMatchObject({
      name: 'https://example.com',
      text: 'https://example.com',
      data: { type: QR_DATA_TYPES.url, url: 'https://example.com' },
      id: expect.stringMatching(/^legacy-/),
      revision: 1,
      updatedAt: '1970-01-01T00:00:00.000Z',
    })
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

  it('migrates the same legacy payload to the same stable record ID on every device', () => {
    const serialized = JSON.stringify([{ name: 'Shared', text: 'shared', data: { type: QR_DATA_TYPES.text, text: 'shared' } }])
    expect(parseSavedCodes(serialized)[0].id).toBe(parseSavedCodes(serialized)[0].id)
  })

  it('keeps edits and additions from two devices without duplicating the edited record', () => {
    const base = parseSavedCodes(JSON.stringify([{ name: 'Shared', text: 'shared', data: { type: QR_DATA_TYPES.text, text: 'shared' } }]))
    const laptop = reconcileSavedCodes(base, [{ ...base[0], name: 'Renamed shared' }], '2026-07-12T10:00:00.000Z')
    const mobile = reconcileSavedCodes(base, [...base, {
      name: 'Mobile', text: '5901234123457', data: { type: QR_DATA_TYPES.barcode, format: 'EAN_13', text: '5901234123457' },
    }], '2026-07-12T11:00:00.000Z')

    const merged = mergeSavedCodes(laptop, mobile)
    expect(activeSavedCodes(merged)).toHaveLength(2)
    expect(activeSavedCodes(merged).map(({ name }) => name)).toEqual(['Renamed shared', 'Mobile'])
    expect(merged[0]).toMatchObject({ revision: 2, updatedAt: '2026-07-12T10:00:00.000Z' })
  })

  it('propagates a deletion tombstone instead of resurrecting a stale device copy', () => {
    const base = parseSavedCodes(JSON.stringify([{ name: 'Shared', text: 'shared', data: { type: QR_DATA_TYPES.text, text: 'shared' } }]))
    const deleted = reconcileSavedCodes(base, [], '2026-07-12T10:00:00.000Z')
    const merged = mergeSavedCodes(base, deleted)

    expect(activeSavedCodes(merged)).toEqual([])
    expect(merged[0]).toMatchObject({ revision: 2, deletedAt: '2026-07-12T10:00:00.000Z' })
    const serialized = serializePersistentSavedCodes(merged)
    expect(serialized).not.toContain('shared')
    expect(parseSavedCodes(serialized)[0].deletedAt).toBe('2026-07-12T10:00:00.000Z')
  })

  it('lets deletion win an equal-revision edit/delete conflict across two devices', () => {
    const base = parseSavedCodes(JSON.stringify([{ name: 'Shared', text: 'shared', data: { type: QR_DATA_TYPES.text, text: 'shared' } }]))
    const edited = reconcileSavedCodes(base, [{ ...base[0], name: 'Edited offline' }], '2026-07-12T11:00:00.000Z')
    const deleted = reconcileSavedCodes(base, [], '2026-07-12T10:00:00.000Z')

    expect(activeSavedCodes(mergeSavedCodes(edited, deleted))).toEqual([])
  })

  it('resolves concurrent edits by revision, then modification time', () => {
    const base = parseSavedCodes(JSON.stringify([{ name: 'Shared', text: 'shared', data: { type: QR_DATA_TYPES.text, text: 'shared' } }]))
    const earlier = reconcileSavedCodes(base, [{ ...base[0], name: 'Earlier edit' }], '2026-07-12T10:00:00.000Z')
    const later = reconcileSavedCodes(base, [{ ...base[0], name: 'Later edit' }], '2026-07-12T11:00:00.000Z')

    expect(activeSavedCodes(mergeSavedCodes(earlier, later))[0].name).toBe('Later edit')
  })

  it('matches the same raw QR payload even when it was saved under a different non-barcode type', () => {
    const url: SavedQrCode = { name: 'URL', text: 'https://example.com', data: { type: QR_DATA_TYPES.url, url: 'https://example.com' } }
    const text: SavedQrCode = { name: 'Text', text: 'https://example.com', data: { type: QR_DATA_TYPES.text, text: 'https://example.com' } }

    expect(savedCodeMatchesPayload(url, text)).toBe(true)
  })

  it('does not collapse barcodes with the same text but different formats', () => {
    const ean: SavedQrCode = { name: 'EAN', text: '12345678', data: { type: QR_DATA_TYPES.barcode, format: 'EAN_8', text: '12345678' } }
    const code128: SavedQrCode = { name: 'Code 128', text: '12345678', data: { type: QR_DATA_TYPES.barcode, format: 'CODE_128', text: '12345678' } }

    expect(savedCodeMatchesPayload(ean, code128)).toBe(false)
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

  it('escapes WiFi delimiters and preserves hidden-network metadata', () => {
    const wifi = { type: QR_DATA_TYPES.wifi, ssid: 'Cafe; HQ:North', password: 'p\\ass;word', encryption: 'WPA', hidden: true } as const
    const encoded = qrDataAsText(wifi)

    expect(encoded).toBe('WIFI:T:WPA;S:Cafe\\; HQ\\:North;P:p\\\\ass\\;word;H:true;;')
    expect(parseQrPayload(encoded)).toEqual(wifi)
  })

  it('preserves scanned barcode format metadata', () => {
    const codes = parseSavedCodes(JSON.stringify([
      {
        name: '',
        text: '5901234123457',
        data: { type: QR_DATA_TYPES.barcode, format: 'EAN_13', text: '5901234123457' },
      },
    ]))

    expect(codes[0]).toMatchObject({
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

  it('round-trips SEPA, WhatsApp, authenticator, and crypto payment payloads', () => {
    const sepa = {
      type: QR_DATA_TYPES.sepa, recipient: 'Example GmbH', iban: 'DE89 3704 0044 0532 0130 00', bic: 'COBADEFFXXX',
      amount: '49.90', purpose: '', reference: 'RF18539007547034', information: '',
    } as const
    expect(parseQrPayload(qrDataAsText(sepa))).toEqual({ ...sepa, iban: 'DE89370400440532013000' })

    const whatsapp = { type: QR_DATA_TYPES.whatsapp, phone: '+49 170 1234567', message: 'Hello there' } as const
    expect(qrDataAsText(whatsapp)).toBe('https://wa.me/491701234567?text=Hello+there')
    expect(parseQrPayload(qrDataAsText(whatsapp))).toEqual({ ...whatsapp, phone: '491701234567' })

    const otp = {
      type: QR_DATA_TYPES.otp, otpType: 'totp', issuer: 'Example', account: 'alice@example.com', secret: 'JBSWY3DPEHPK3PXP',
      algorithm: 'SHA1', digits: '6', period: '30', counter: '0',
    } as const
    expect(parseQrPayload(qrDataAsText(otp))).toEqual({ ...otp, counter: '' })

    const bitcoin = { type: QR_DATA_TYPES.payment, provider: 'Bitcoin', target: 'bc1qexample', amount: '0.01', currency: 'BTC', note: 'Coffee' } as const
    expect(parseQrPayload(qrDataAsText(bitcoin))).toMatchObject({ type: QR_DATA_TYPES.payment, provider: 'Bitcoin', target: 'bc1qexample', amount: '0.01', note: 'Coffee' })
  })

  it('keeps authenticator setup codes out of persistence and sync', () => {
    const codes: SavedQrCode[] = [
      { name: 'Site', text: 'https://example.com', data: { type: QR_DATA_TYPES.url, url: 'https://example.com' } },
      {
        name: 'OTP', text: 'otpauth://totp/Example:alice',
        data: { type: QR_DATA_TYPES.otp, otpType: 'totp', issuer: 'Example', account: 'alice', secret: 'SECRET', algorithm: 'SHA1', digits: '6', period: '30', counter: '' },
      },
    ]

    expect(syncableSavedCodes(codes)).toEqual([codes[0]])
    expect(JSON.parse(serializePersistentSavedCodes(codes))).toEqual([expect.objectContaining(codes[0])])
  })
})
