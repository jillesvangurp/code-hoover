export const QR_DATA_TYPES = {
  url: 'qr.QrData.Url',
  text: 'qr.QrData.Text',
  vcard: 'qr.QrData.VCard',
  wifi: 'qr.QrData.Wifi',
  barcode: 'qr.QrData.Barcode',
} as const

export type QrType = 'URL' | 'TEXT' | 'VCARD' | 'WIFI'

export interface UrlData {
  type: typeof QR_DATA_TYPES.url
  url: string
}

export interface TextData {
  type: typeof QR_DATA_TYPES.text
  text: string
}

export interface VCardData {
  type: typeof QR_DATA_TYPES.vcard
  name: string
  firstName: string
  lastName: string
  additionalNames: string
  prefix: string
  suffix: string
  nickname: string
  title: string
  organization: string
  email: string
  emailType: string
  phone: string
  phoneType: string
  url: string
  street: string
  city: string
  region: string
  postalCode: string
  country: string
  note: string
}

export interface WifiData {
  type: typeof QR_DATA_TYPES.wifi
  ssid: string
  password: string
  encryption: string
}

export interface BarcodeData {
  type: typeof QR_DATA_TYPES.barcode
  format: string
  text: string
}

export type QrData = UrlData | TextData | VCardData | WifiData | BarcodeData

export interface SavedQrCode {
  name: string
  text: string
  data: QrData
}

const stringValue = (value: unknown): string => (typeof value === 'string' ? value : '')

export function savedCodeIdentity(code: SavedQrCode): string {
  if (code.data.type === QR_DATA_TYPES.barcode) return `${code.data.type}\n${code.data.format}\n${code.data.text}`
  return `${code.data.type}\n${qrDataAsText(code.data)}`
}

export function mergeSavedCodes(primary: SavedQrCode[], secondary: SavedQrCode[]): SavedQrCode[] {
  const seen = new Set<string>()
  const merged: SavedQrCode[] = []
  for (const code of [...primary, ...secondary]) {
    const identity = savedCodeIdentity(code)
    if (seen.has(identity)) continue
    seen.add(identity)
    merged.push(code)
  }
  return merged
}

export function normalizeQrData(value: unknown): QrData | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>

  switch (candidate.type) {
    case QR_DATA_TYPES.url:
    case 'URL':
      return { type: QR_DATA_TYPES.url, url: stringValue(candidate.url) }
    case QR_DATA_TYPES.text:
    case 'TEXT':
      return { type: QR_DATA_TYPES.text, text: stringValue(candidate.text) }
    case QR_DATA_TYPES.wifi:
    case 'WIFI':
      return {
        type: QR_DATA_TYPES.wifi,
        ssid: stringValue(candidate.ssid),
        password: stringValue(candidate.password),
        encryption: stringValue(candidate.encryption) || 'WPA',
      }
    case QR_DATA_TYPES.barcode:
    case 'BARCODE':
      return {
        type: QR_DATA_TYPES.barcode,
        format: stringValue(candidate.format),
        text: stringValue(candidate.text),
      }
    case QR_DATA_TYPES.vcard:
    case 'VCARD':
      return {
        type: QR_DATA_TYPES.vcard,
        name: stringValue(candidate.name),
        firstName: stringValue(candidate.firstName),
        lastName: stringValue(candidate.lastName),
        additionalNames: stringValue(candidate.additionalNames),
        prefix: stringValue(candidate.prefix),
        suffix: stringValue(candidate.suffix),
        nickname: stringValue(candidate.nickname),
        title: stringValue(candidate.title),
        organization: stringValue(candidate.organization),
        email: stringValue(candidate.email),
        emailType: stringValue(candidate.emailType),
        phone: stringValue(candidate.phone),
        phoneType: stringValue(candidate.phoneType),
        url: stringValue(candidate.url),
        street: stringValue(candidate.street),
        city: stringValue(candidate.city),
        region: stringValue(candidate.region),
        postalCode: stringValue(candidate.postalCode),
        country: stringValue(candidate.country),
        note: stringValue(candidate.note),
      }
    default:
      return null
  }
}

export function parseSavedCodes(json: string): SavedQrCode[] {
  const parsed: unknown = JSON.parse(json)
  if (!Array.isArray(parsed)) throw new Error('Expected an array')
  return parsed.map(parseSavedCode)
}

export function parseSavedCode(item: unknown): SavedQrCode {
  if (!item || typeof item !== 'object') throw new Error('Invalid saved code')
  const candidate = item as Record<string, unknown>
  const data = normalizeQrData(candidate.data)
  if (!data || typeof candidate.text !== 'string') throw new Error('Invalid saved code')
  const name = stringValue(candidate.name).trim() || candidate.text
  return { name, text: candidate.text, data }
}

function escapeVCard(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\r\n', '\\n')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll(':', '\\:')
}

function unescapeVCard(value: string): string {
  let result = ''
  let escaped = false
  for (const character of value) {
    if (escaped) {
      result += character === 'n' || character === 'N' ? '\n' : character
      escaped = false
    } else if (character === '\\') {
      escaped = true
    } else {
      result += character
    }
  }
  return escaped ? `${result}\\` : result
}

function splitVCardComponents(value: string): string[] {
  const result: string[] = []
  let current = ''
  let escaped = false
  for (const character of value) {
    if (escaped) {
      current += character === 'n' || character === 'N' ? '\n' : character
      escaped = false
    } else if (character === '\\') {
      escaped = true
    } else if (character === ';') {
      result.push(current)
      current = ''
    } else {
      current += character
    }
  }
  result.push(escaped ? `${current}\\` : current)
  return result
}

function bestVCardName(data: VCardData): string {
  if (data.name.trim()) return data.name.trim()
  const structured = [data.prefix, data.firstName, data.additionalNames, data.lastName, data.suffix]
    .filter(Boolean)
    .join(' ')
    .trim()
  return structured || data.organization.trim() || data.nickname.trim()
}

export function qrDataAsText(data: QrData): string {
  switch (data.type) {
    case QR_DATA_TYPES.url:
      return data.url
    case QR_DATA_TYPES.text:
      return data.text
    case QR_DATA_TYPES.wifi:
      return `WIFI:T:${data.encryption};S:${data.ssid};P:${data.password};;`
    case QR_DATA_TYPES.barcode:
      return data.text
    case QR_DATA_TYPES.vcard: {
      const lines = ['BEGIN:VCARD', 'VERSION:3.0']
      lines.push(`FN:${escapeVCard(bestVCardName(data) || 'vcard')}`)
      const structured = [data.lastName, data.firstName, data.additionalNames, data.prefix, data.suffix]
      if (structured.some(Boolean)) lines.push(`N:${structured.map(escapeVCard).join(';')}`)
      if (data.nickname) lines.push(`NICKNAME:${escapeVCard(data.nickname)}`)
      if (data.title) lines.push(`TITLE:${escapeVCard(data.title)}`)
      if (data.organization) lines.push(`ORG:${escapeVCard(data.organization)}`)
      if (data.email) lines.push(`EMAIL;TYPE=${(data.emailType || 'INTERNET').toUpperCase()}:${escapeVCard(data.email)}`)
      if (data.phone) lines.push(`TEL${data.phoneType ? `;TYPE=${data.phoneType.toUpperCase()}` : ''}:${escapeVCard(data.phone)}`)
      if (data.url) lines.push(`URL:${escapeVCard(data.url)}`)
      if ([data.street, data.city, data.region, data.postalCode, data.country].some(Boolean)) {
        lines.push(`ADR:;;${[data.street, data.city, data.region, data.postalCode, data.country].map(escapeVCard).join(';')}`)
      }
      if (data.note) lines.push(`NOTE:${escapeVCard(data.note)}`)
      lines.push('END:VCARD')
      return lines.join('\n')
    }
  }
}

export function defaultDisplayName(data: QrData): string {
  if (data.type === QR_DATA_TYPES.url) return data.url
  if (data.type === QR_DATA_TYPES.text) return data.text
  if (data.type === QR_DATA_TYPES.wifi) return data.ssid || qrDataAsText(data)
  if (data.type === QR_DATA_TYPES.barcode) return data.text

  const base = bestVCardName(data) || 'vcard'
  return base.toLowerCase().endsWith(' vcard') ? base : `${base} vcard`
}

function unfoldVCard(text: string): string[] {
  const lines: string[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd()
    if (/^[ \t]/.test(line) && lines.length) lines[lines.length - 1] += line.slice(1)
    else lines.push(line)
  }
  return lines
}

function extractType(parameters: string[]): string {
  return parameters
    .map((parameter) => {
      const separator = parameter.indexOf('=')
      if (separator < 0) return parameter
      return parameter.slice(0, separator).toUpperCase() === 'TYPE' ? parameter.slice(separator + 1) : ''
    })
    .filter(Boolean)
    .join(',')
    .replaceAll(' ', '')
    .toUpperCase()
}

export function parseVCard(text: string): VCardData | null {
  const trimmed = text.trim()
  if (!trimmed.toUpperCase().startsWith('BEGIN:VCARD')) return null
  const data: VCardData = {
    type: QR_DATA_TYPES.vcard,
    name: '', firstName: '', lastName: '', additionalNames: '', prefix: '', suffix: '',
    nickname: '', title: '', organization: '', email: '', emailType: '', phone: '', phoneType: '',
    url: '', street: '', city: '', region: '', postalCode: '', country: '', note: '',
  }
  let hasField = false

  for (const rawLine of unfoldVCard(trimmed)) {
    const line = rawLine.trim()
    if (!line || /^(BEGIN|END|VERSION)/i.test(line)) continue
    const separator = line.indexOf(':')
    if (separator < 0) continue
    const [key, ...parameters] = line.slice(0, separator).split(';')
    const value = line.slice(separator + 1)
    const type = extractType(parameters)

    switch (key.toUpperCase()) {
      case 'FN': data.name = unescapeVCard(value); break
      case 'N': {
        const values = splitVCardComponents(value)
        ;[data.lastName, data.firstName, data.additionalNames, data.prefix, data.suffix] = Array.from({ length: 5 }, (_, index) => values[index] ?? '')
        break
      }
      case 'NICKNAME': data.nickname = unescapeVCard(value); break
      case 'TITLE': data.title = unescapeVCard(value); break
      case 'ORG': data.organization = unescapeVCard(value); break
      case 'EMAIL': data.email = unescapeVCard(value); data.emailType = type; break
      case 'TEL': data.phone = unescapeVCard(value); data.phoneType = type; break
      case 'URL': data.url = unescapeVCard(value); break
      case 'ADR': {
        const values = splitVCardComponents(value)
        ;[data.street, data.city, data.region, data.postalCode, data.country] = Array.from({ length: 5 }, (_, index) => values[index + 2] ?? '')
        break
      }
      case 'NOTE': data.note = unescapeVCard(value); break
      default: continue
    }
    hasField ||= Object.entries(data).some(([field, fieldValue]) => field !== 'type' && Boolean(fieldValue))
  }
  return hasField ? data : null
}

export type Translate = (id: string, args?: Record<string, string | number>) => string

export function formatQrData(data: QrData, translate: Translate): string {
  if (data.type === QR_DATA_TYPES.url) return data.url
  if (data.type === QR_DATA_TYPES.text) return data.text
  if (data.type === QR_DATA_TYPES.barcode) {
    return [
      translate('default-type-label', { value: data.format }),
      data.text,
    ].join('\n')
  }
  if (data.type === QR_DATA_TYPES.wifi) {
    return [
      translate('default-ssid-label', { value: data.ssid }),
      translate('default-password-label', { value: data.password }),
      translate('default-type-label', { value: data.encryption }),
    ].join('\n')
  }

  const rows: Array<[string, string]> = [
    ['default-name-label', bestVCardName(data)],
    ['default-first-name-label', data.firstName],
    ['default-last-name-label', data.lastName],
    ['default-additional-names-label', data.additionalNames],
    ['default-name-prefix-label', data.prefix],
    ['default-name-suffix-label', data.suffix],
    ['default-nickname-label', data.nickname],
    ['default-organization-label', data.organization],
    ['default-title-label', data.title],
    ['default-email-label', data.email ? `${data.email}${data.emailType ? ` (${data.emailType.toUpperCase()})` : ''}` : ''],
    ['default-phone-label', data.phone ? `${data.phone}${data.phoneType ? ` (${data.phoneType.toUpperCase()})` : ''}` : ''],
    ['default-url-label', data.url],
    ['default-address-label', [data.street, data.city, data.region, data.postalCode, data.country].filter(Boolean).join(', ')],
    ['default-note-label', data.note],
  ]
  return rows.filter(([, value]) => value).map(([id, value]) => translate(id, { value })).join('\n')
}
