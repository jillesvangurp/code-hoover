import { describe, expect, it } from 'vitest'
import { dataToForm, emptyQrForm, formToSavedCode } from './form'
import { QR_DATA_TYPES } from './qr'

describe('QR form conversion', () => {
  it('creates a saved URL with its value as the default name', () => {
    const saved = formToSavedCode({ ...emptyQrForm(), url: 'https://example.com' }, '2026-07-12T09:00:00.000Z')
    expect(saved).toEqual({
      name: 'https://example.com',
      text: 'https://example.com',
      data: { type: QR_DATA_TYPES.url, url: 'https://example.com' },
      createdAt: '2026-07-12T09:00:00.000Z',
    })
  })

  it('recognizes URL, WiFi, and vCard payloads stored as plain text', () => {
    expect(dataToForm('Web', { type: QR_DATA_TYPES.text, text: 'https://example.com' }).type).toBe('URL')
    expect(dataToForm('WiFi', { type: QR_DATA_TYPES.text, text: 'WIFI:T:WPA2;S:Guest;P:secret;;' })).toMatchObject({
      type: 'WIFI', ssid: 'Guest', password: 'secret', encryption: 'WPA2',
    })
    expect(dataToForm('', { type: QR_DATA_TYPES.text, text: 'BEGIN:VCARD\nFN:Ada\nEND:VCARD' })).toMatchObject({
      type: 'VCARD', name: 'Ada vcard', vcardFullName: 'Ada',
    })
  })
})
