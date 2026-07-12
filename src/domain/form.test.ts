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

  it('creates structured email, SMS, maps, and event codes', () => {
    expect(formToSavedCode({
      ...emptyQrForm(),
      type: 'EMAIL',
      email: 'hello@example.com',
      emailSubject: 'Hi',
      emailBody: 'Body',
    }, null)).toMatchObject({
      name: 'hello@example.com',
      text: 'mailto:hello@example.com?subject=Hi&body=Body',
      data: { type: QR_DATA_TYPES.email, email: 'hello@example.com', subject: 'Hi', body: 'Body' },
    })

    expect(formToSavedCode({
      ...emptyQrForm(),
      type: 'SMS',
      smsPhone: '+4912345',
      smsMessage: 'Ping',
    }, null)).toMatchObject({
      name: '+4912345',
      text: 'sms:+4912345?body=Ping',
      data: { type: QR_DATA_TYPES.sms, phone: '+4912345', message: 'Ping' },
    })

    expect(formToSavedCode({
      ...emptyQrForm(),
      type: 'LOCATION',
      locationLabel: 'FORMATION office',
      locationLatitude: '52.5200',
      locationLongitude: '13.4050',
    }, null)).toMatchObject({
      name: 'FORMATION office',
      data: { type: QR_DATA_TYPES.location, label: 'FORMATION office', latitude: '52.5200', longitude: '13.4050' },
    })

    expect(formToSavedCode({
      ...emptyQrForm(),
      type: 'EVENT',
      eventTitle: 'Demo',
      eventStart: '2026-07-12T12:00',
      eventLocation: 'Berlin',
    }, null)).toMatchObject({
      name: 'Demo',
      data: { type: QR_DATA_TYPES.event, title: 'Demo', start: '2026-07-12T12:00', location: 'Berlin' },
    })
  })

  it('opens scanned action payloads as editable structured forms', () => {
    expect(dataToForm('Email', { type: QR_DATA_TYPES.text, text: 'mailto:hello@example.com?subject=Hi' })).toMatchObject({
      type: 'EMAIL', email: 'hello@example.com', emailSubject: 'Hi',
    })
    expect(dataToForm('Map', { type: QR_DATA_TYPES.text, text: 'https://www.google.com/maps/search/?api=1&query=FORMATION+Berlin' })).toMatchObject({
      type: 'LOCATION', locationQuery: 'FORMATION Berlin',
    })
  })
})
