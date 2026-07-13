import { QR_DATA_TYPES, type QrData } from './qr'

export interface CodeEnrichment {
  summary: string
  facts: Array<{ label: string; value: string }>
}

function sentence(value: string): string {
  const trimmed = value.trim()
  return trimmed && !/[.!?]$/.test(trimmed) ? `${trimmed}.` : trimmed
}

function humanizeHostname(hostname: string): string {
  const parts = hostname.replace(/^www\./, '').split('.')
  const candidate = parts.length > 1 ? parts.at(-2) ?? parts[0] : parts[0]
  return candidate
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function normalizeUrl(value: string): URL | null {
  try {
    return new URL(/^[a-z][a-z\d+.-]*:/i.test(value.trim()) ? value.trim() : `https://${value.trim()}`)
  } catch {
    return null
  }
}

function gtinCheckDigitIsValid(value: string): boolean | null {
  if (!/^\d+$/.test(value) || ![8, 12, 13, 14].includes(value.length)) return null
  const digits = [...value].map(Number)
  const checkDigit = digits.pop()
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === checkDigit
}

function formatDuration(start: string, end: string): string {
  if (!start || !end) return ''
  const parseDate = (value: string) => {
    const compact = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/.exec(value)
    if (!compact) return new Date(value)
    const [, year, month, day, hour = '0', minute = '0', second = '0', utc] = compact
    const parts = [Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)] as const
    return new Date(utc ? Date.UTC(...parts) : new Date(...parts).getTime())
  }
  const startDate = parseDate(start)
  const endDate = parseDate(end)
  const milliseconds = endDate.getTime() - startDate.getTime()
  if (Number.isNaN(milliseconds) || milliseconds <= 0) return ''
  const minutes = Math.round(milliseconds / 60_000)
  if (minutes < 60) return `${minutes} minutes`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours} hr ${remainder} min` : `${hours} ${hours === 1 ? 'hour' : 'hours'}`
}

function urlEnrichment(value: string): CodeEnrichment | null {
  const url = normalizeUrl(value)
  if (!url || !['http:', 'https:'].includes(url.protocol)) return null
  const host = url.hostname.replace(/^www\./, '')
  const site = humanizeHostname(host)
  const facts = [
    { label: 'Website', value: site || host },
    { label: 'Destination', value: host },
    { label: 'Connection', value: url.protocol === 'https:' ? 'Encrypted HTTPS' : 'Unencrypted HTTP' },
    ...(url.searchParams.size ? [{ label: 'URL parameters', value: `${url.searchParams.size}` }] : []),
  ]
  return {
    summary: sentence(`${url.protocol === 'https:' ? 'A secure' : 'An unencrypted'} web link to ${site || host}`),
    facts,
  }
}

function barcodeEnrichment(data: QrData & { type: typeof QR_DATA_TYPES.barcode }): CodeEnrichment | null {
  const value = data.text.trim()
  const validCheckDigit = gtinCheckDigitIsValid(value)
  let subject = ''
  let identifier = ''

  if (data.format === 'EAN_13' && /^(978|979)/.test(value)) {
    subject = 'A book or publication encoded as an ISBN-13 identifier.'
    identifier = 'ISBN-13'
  } else if (data.format === 'EAN_13') {
    subject = 'A retail product encoded with a GTIN-13 identifier.'
    identifier = 'GTIN-13'
  } else if (data.format === 'EAN_8') {
    subject = 'A small retail item encoded with a GTIN-8 identifier.'
    identifier = 'GTIN-8'
  } else if (data.format === 'UPC_A') {
    subject = 'A retail product encoded with a UPC-A identifier.'
    identifier = 'UPC-A'
  } else if (data.format === 'UPC_E') {
    subject = 'A retail product encoded with a compact UPC-E identifier.'
    identifier = 'UPC-E'
  } else if (data.format === 'ITF') {
    subject = 'A logistics or packaging identifier encoded as Interleaved 2 of 5.'
    identifier = 'Interleaved 2 of 5'
  } else if (data.format === 'CODE_128') {
    subject = 'A general-purpose inventory, shipping, or logistics identifier.'
    identifier = 'Code 128'
  } else if (data.format === 'PDF_417') {
    subject = 'A high-capacity stacked barcode commonly used for documents, tickets, and identity data.'
    identifier = 'PDF417'
  } else if (data.format === 'DATA_MATRIX') {
    subject = 'A compact matrix identifier commonly used for components, products, and traceability.'
    identifier = 'Data Matrix'
  }

  if (!subject) return null
  return {
    summary: subject,
    facts: [
      { label: 'Identifier class', value: identifier },
      ...(validCheckDigit === null ? [] : [{ label: 'Check digit', value: validCheckDigit ? 'Valid' : 'Does not validate' }]),
      { label: 'Encoded characters', value: `${value.length}` },
    ],
  }
}

export function enrichCode(data: QrData, codeName: string): CodeEnrichment | null {
  switch (data.type) {
    case QR_DATA_TYPES.url:
      return urlEnrichment(data.url)
    case QR_DATA_TYPES.vcard: {
      const name = data.name || [data.firstName, data.lastName].filter(Boolean).join(' ') || codeName
      const role = [data.title, data.organization].filter(Boolean).join(' at ')
      const methods = [data.email && 'email', data.phone && 'phone', data.url && 'website'].filter(Boolean).join(', ')
      if (!name && !role && !methods) return null
      return {
        summary: sentence(`A contact card for ${name}${role ? `, ${role}` : ''}`),
        facts: [
          ...(data.organization ? [{ label: 'Organization', value: data.organization }] : []),
          ...(data.title ? [{ label: 'Role', value: data.title }] : []),
          ...(methods ? [{ label: 'Contact options', value: methods }] : []),
          ...([data.city, data.country].filter(Boolean).length ? [{ label: 'Based in', value: [data.city, data.country].filter(Boolean).join(', ') }] : []),
        ],
      }
    }
    case QR_DATA_TYPES.wifi: {
      if (!data.ssid) return null
      const isOpen = /^nopass$/i.test(data.encryption) || (!data.encryption && !data.password)
      const isGuest = /guest|visitor|public|hotel|cafe|wifi/i.test(data.ssid)
      return {
        summary: sentence(`${isGuest ? 'A guest or public' : 'A'} Wi-Fi network named ${data.ssid}`),
        facts: [
          { label: 'Access', value: data.password ? 'Password included' : 'No password encoded' },
          { label: 'Security', value: isOpen ? 'Open network' : data.encryption || 'Protected' },
        ],
      }
    }
    case QR_DATA_TYPES.email: {
      if (!data.email) return null
      const domain = data.email.split('@')[1] ?? ''
      return {
        summary: sentence(`An email draft to ${data.email}${data.subject ? ` about “${data.subject}”` : ''}`),
        facts: [
          ...(domain ? [{ label: 'Recipient domain', value: domain }] : []),
          { label: 'Prefilled content', value: [data.subject && 'subject', data.body && 'message'].filter(Boolean).join(' and ') || 'Recipient only' },
        ],
      }
    }
    case QR_DATA_TYPES.phone:
      return data.phone ? { summary: sentence(`A tap-to-call code for ${data.phone}`), facts: [] } : null
    case QR_DATA_TYPES.sms:
      return data.phone ? {
        summary: sentence(`A text message prepared for ${data.phone}`),
        facts: data.message ? [{ label: 'Prefilled message', value: `${data.message.length} characters` }] : [],
      } : null
    case QR_DATA_TYPES.location: {
      const place = data.label || data.query
      const hasCoordinates = Boolean(data.latitude && data.longitude)
      if (!place && !hasCoordinates) return null
      return {
        summary: sentence(`A map location for ${place || `${data.latitude}, ${data.longitude}`}`),
        facts: [
          ...(place ? [{ label: 'Place', value: place }] : []),
          ...(hasCoordinates ? [{ label: 'Precision', value: 'Exact coordinates included' }] : []),
        ],
      }
    }
    case QR_DATA_TYPES.event: {
      if (!data.title && !data.start && !data.location) return null
      const duration = formatDuration(data.start, data.end)
      return {
        summary: sentence(`A calendar event${data.title ? ` for ${data.title}` : ''}${data.location ? ` at ${data.location}` : ''}`),
        facts: [
          ...(duration ? [{ label: 'Duration', value: duration }] : []),
          ...(data.location ? [{ label: 'Venue', value: data.location }] : []),
          ...(data.description ? [{ label: 'Includes', value: 'Event description' }] : []),
        ],
      }
    }
    case QR_DATA_TYPES.barcode:
      return barcodeEnrichment(data)
    case QR_DATA_TYPES.text:
      return null
  }
}
