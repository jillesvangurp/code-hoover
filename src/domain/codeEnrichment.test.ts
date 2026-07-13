import { describe, expect, it } from 'vitest'
import { QR_DATA_TYPES } from './qr'
import { enrichCode } from './codeEnrichment'

describe('enrichCode', () => {
  it('recognizes ISBN barcodes and validates their check digit', () => {
    expect(enrichCode({ type: QR_DATA_TYPES.barcode, format: 'EAN_13', text: '9780141036144' }, 'Book'))
      .toEqual({
        summary: 'A book or publication encoded as an ISBN-13 identifier.',
        facts: [
          { label: 'Identifier class', value: 'ISBN-13' },
          { label: 'Check digit', value: 'Valid' },
          { label: 'Encoded characters', value: '13' },
        ],
      })
  })

  it('describes a URL using only facts available in its payload', () => {
    expect(enrichCode({ type: QR_DATA_TYPES.url, url: 'https://www.example.com/products?id=42' }, 'Product'))
      .toEqual({
        summary: 'A secure web link to Example.',
        facts: [
          { label: 'Website', value: 'Example' },
          { label: 'Destination', value: 'example.com' },
          { label: 'Connection', value: 'Encrypted HTTPS' },
          { label: 'URL parameters', value: '1' },
        ],
      })
  })

  it('summarizes contact metadata without inventing missing details', () => {
    const enrichment = enrichCode({
      type: QR_DATA_TYPES.vcard,
      name: 'Alex Smith', firstName: 'Alex', lastName: 'Smith', additionalNames: '', prefix: '', suffix: '', nickname: '',
      title: 'Designer', organization: 'FORMATION', email: 'alex@example.com', emailType: 'INTERNET', phone: '', phoneType: '',
      url: '', street: '', city: 'Berlin', region: '', postalCode: '', country: 'Germany', note: '',
    }, 'Alex')

    expect(enrichment?.summary).toBe('A contact card for Alex Smith, Designer at FORMATION.')
    expect(enrichment?.facts).toContainEqual({ label: 'Contact options', value: 'email' })
    expect(enrichment?.facts).toContainEqual({ label: 'Based in', value: 'Berlin, Germany' })
  })

  it('stays absent for plain text where no subject can be inferred safely', () => {
    expect(enrichCode({ type: QR_DATA_TYPES.text, text: 'A note' }, 'Note')).toBeNull()
  })

  it('derives event duration from compact calendar timestamps', () => {
    expect(enrichCode({
      type: QR_DATA_TYPES.event,
      title: 'Workshop',
      start: '20260720T090000Z',
      end: '20260720T103000Z',
      location: 'Berlin',
      description: '',
    }, 'Workshop')?.facts).toContainEqual({ label: 'Duration', value: '1 hr 30 min' })
  })
})
