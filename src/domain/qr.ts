export const QR_DATA_TYPES = {
  url: 'qr.QrData.Url',
  text: 'qr.QrData.Text',
  vcard: 'qr.QrData.VCard',
  wifi: 'qr.QrData.Wifi',
  email: 'qr.QrData.Email',
  phone: 'qr.QrData.Phone',
  sms: 'qr.QrData.Sms',
  location: 'qr.QrData.Location',
  event: 'qr.QrData.Event',
  barcode: 'qr.QrData.Barcode',
  sepa: 'qr.QrData.Sepa',
  whatsapp: 'qr.QrData.WhatsApp',
  deepLink: 'qr.QrData.DeepLink',
  otp: 'qr.QrData.Otp',
  payment: 'qr.QrData.Payment',
} as const

export type QrType = 'URL' | 'TEXT' | 'VCARD' | 'WIFI' | 'EMAIL' | 'PHONE' | 'SMS' | 'LOCATION' | 'EVENT' | 'BARCODE' | 'SEPA' | 'WHATSAPP' | 'DEEPLINK' | 'OTP' | 'PAYMENT'

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
  hidden?: boolean
}

export interface EmailData {
  type: typeof QR_DATA_TYPES.email
  email: string
  subject: string
  body: string
}

export interface PhoneData {
  type: typeof QR_DATA_TYPES.phone
  phone: string
}

export interface SmsData {
  type: typeof QR_DATA_TYPES.sms
  phone: string
  message: string
}

export interface LocationData {
  type: typeof QR_DATA_TYPES.location
  label: string
  query: string
  latitude: string
  longitude: string
}

export interface EventData {
  type: typeof QR_DATA_TYPES.event
  title: string
  start: string
  end: string
  location: string
  description: string
}

export interface BarcodeData {
  type: typeof QR_DATA_TYPES.barcode
  format: string
  text: string
}

export interface SepaData {
  type: typeof QR_DATA_TYPES.sepa
  recipient: string
  iban: string
  bic: string
  amount: string
  purpose: string
  reference: string
  information: string
}

export interface WhatsAppData {
  type: typeof QR_DATA_TYPES.whatsapp
  phone: string
  message: string
}

export interface DeepLinkData {
  type: typeof QR_DATA_TYPES.deepLink
  label: string
  url: string
}

export interface OtpData {
  type: typeof QR_DATA_TYPES.otp
  otpType: string
  issuer: string
  account: string
  secret: string
  algorithm: string
  digits: string
  period: string
  counter: string
}

export interface PaymentData {
  type: typeof QR_DATA_TYPES.payment
  provider: string
  target: string
  amount: string
  currency: string
  note: string
}

export type QrData = UrlData | TextData | VCardData | WifiData | EmailData | PhoneData | SmsData | LocationData | EventData | BarcodeData | SepaData | WhatsAppData | DeepLinkData | OtpData | PaymentData

export interface SavedQrCode {
  name: string
  text: string
  data: QrData
  createdAt?: string
  id?: string
  revision?: number
  updatedAt?: string
  deletedAt?: string
}

export const CODE_TYPES_HELP_URL = 'https://en.wikipedia.org/wiki/Barcode#Types_of_barcodes'

const stringValue = (value: unknown): string => (typeof value === 'string' ? value : '')

export function codeFamilyLabel(data: QrData): string {
  return data.type === QR_DATA_TYPES.barcode ? 'Barcode' : 'QR code'
}

export function codePayloadTypeLabel(data: QrData): string {
  switch (data.type) {
    case QR_DATA_TYPES.url:
      return 'URL'
    case QR_DATA_TYPES.text:
      return 'Text'
    case QR_DATA_TYPES.wifi:
      return 'Wi-Fi'
    case QR_DATA_TYPES.email:
      return 'Email'
    case QR_DATA_TYPES.phone:
      return 'Phone'
    case QR_DATA_TYPES.sms:
      return 'SMS'
    case QR_DATA_TYPES.location:
      return 'Maps'
    case QR_DATA_TYPES.event:
      return 'Event'
    case QR_DATA_TYPES.vcard:
      return 'vCard'
    case QR_DATA_TYPES.barcode:
      return data.format || 'Barcode'
    case QR_DATA_TYPES.sepa:
      return 'SEPA payment'
    case QR_DATA_TYPES.whatsapp:
      return 'WhatsApp'
    case QR_DATA_TYPES.deepLink:
      return 'App link'
    case QR_DATA_TYPES.otp:
      return 'Authenticator'
    case QR_DATA_TYPES.payment:
      return data.provider || 'Payment'
  }
}

export function savedCodeIdentity(code: SavedQrCode): string {
  if (code.data.type === QR_DATA_TYPES.barcode) return `${code.data.type}\n${code.data.format}\n${code.data.text}`
  return `${code.data.type}\n${qrDataAsText(code.data)}`
}

const LEGACY_RECORD_TIME = '1970-01-01T00:00:00.000Z'

function stableHash(value: string): string {
  let first = 0x811c9dc5
  let second = 0x9e3779b9
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193)
    second = Math.imul(second ^ code, 0x85ebca6b)
  }
  return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`
}

function validRecordId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(value)
}

function validRevision(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1
}

function validRecordTime(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Date.parse(value))
}

function randomRecordId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return `code-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

export function savedCodeRecordId(code: SavedQrCode): string {
  return validRecordId(code.id) ? code.id : `legacy-${stableHash(savedCodeIdentity(code))}`
}

export function normalizeSavedCodeRecord(code: SavedQrCode): SavedQrCode {
  const createdAt = validRecordTime(code.createdAt) ? code.createdAt : undefined
  const updatedAt = validRecordTime(code.updatedAt) ? code.updatedAt : createdAt ?? LEGACY_RECORD_TIME
  const deletedAt = validRecordTime(code.deletedAt) ? code.deletedAt : undefined
  return {
    name: code.name,
    text: code.text,
    data: code.data,
    ...(createdAt ? { createdAt } : {}),
    id: savedCodeRecordId(code),
    revision: validRevision(code.revision) ? code.revision : 1,
    updatedAt,
    ...(deletedAt ? { deletedAt } : {}),
  }
}

export function createSavedCodeRecord(code: SavedQrCode, now = new Date().toISOString()): SavedQrCode {
  return {
    ...code,
    id: validRecordId(code.id) ? code.id : randomRecordId(),
    revision: validRevision(code.revision) ? code.revision : 1,
    updatedAt: validRecordTime(code.updatedAt) ? code.updatedAt : now,
  }
}

function savedCodeContent(code: SavedQrCode): string {
  return JSON.stringify({ name: code.name, text: code.text, data: code.data })
}

function recordTime(code: SavedQrCode): number {
  const value = Date.parse(code.updatedAt ?? '')
  return Number.isNaN(value) ? 0 : value
}

export function resolveSavedCodeConflict(leftValue: SavedQrCode, rightValue: SavedQrCode): SavedQrCode {
  const left = normalizeSavedCodeRecord(leftValue)
  const right = normalizeSavedCodeRecord(rightValue)
  if (left.id !== right.id) throw new Error('Cannot resolve different saved code records')
  const leftRevision = left.revision ?? 1
  const rightRevision = right.revision ?? 1
  if (leftRevision !== rightRevision) return leftRevision > rightRevision ? left : right
  if (Boolean(left.deletedAt) !== Boolean(right.deletedAt)) return left.deletedAt ? left : right
  const leftTime = recordTime(left)
  const rightTime = recordTime(right)
  if (leftTime !== rightTime) return leftTime > rightTime ? left : right
  return JSON.stringify(left) >= JSON.stringify(right) ? left : right
}

export function savedCodeMatchesPayload(existing: SavedQrCode, candidate: SavedQrCode): boolean {
  if (savedCodeIdentity(existing) === savedCodeIdentity(candidate)) return true
  if (existing.data.type === QR_DATA_TYPES.barcode || candidate.data.type === QR_DATA_TYPES.barcode) return false
  return existing.text.trim() === candidate.text.trim()
}

export function mergeSavedCodes(primary: SavedQrCode[], secondary: SavedQrCode[]): SavedQrCode[] {
  const merged: SavedQrCode[] = []
  const positions = new Map<string, number>()
  for (const value of [...primary, ...secondary]) {
    const code = normalizeSavedCodeRecord(value)
    const position = positions.get(code.id as string)
    if (position === undefined) {
      positions.set(code.id as string, merged.length)
      merged.push(code)
      continue
    }
    merged[position] = resolveSavedCodeConflict(merged[position], code)
  }
  return merged
}

export function activeSavedCodes(codes: SavedQrCode[]): SavedQrCode[] {
  return mergeSavedCodes(codes, []).filter((code) => !code.deletedAt)
}

export function reconcileSavedCodes(currentValues: SavedQrCode[], nextActiveValues: SavedQrCode[], now = new Date().toISOString()): SavedQrCode[] {
  const current = mergeSavedCodes(currentValues, [])
  const currentById = new Map(current.map((code) => [code.id as string, code]))
  const next: SavedQrCode[] = []
  const retainedIds = new Set<string>()

  for (const value of nextActiveValues) {
    const candidate = normalizeSavedCodeRecord(value)
    const id = candidate.id as string
    if (retainedIds.has(id)) continue
    retainedIds.add(id)
    const previous = currentById.get(id)
    if (!previous) {
      next.push(createSavedCodeRecord(value, now))
      continue
    }
    if (!previous.deletedAt && savedCodeContent(previous) === savedCodeContent(candidate)) {
      next.push(previous)
      continue
    }
    next.push({
      ...candidate,
      id,
      revision: (previous.revision ?? 1) + 1,
      updatedAt: now,
      ...(previous.createdAt && !candidate.createdAt ? { createdAt: previous.createdAt } : {}),
      deletedAt: undefined,
    })
  }

  for (const previous of current) {
    const id = previous.id as string
    if (retainedIds.has(id)) continue
    if (previous.deletedAt) {
      next.push(previous)
      continue
    }
    if (isSensitiveQrData(previous.data)) continue
    next.push({
      name: '',
      text: '',
      data: { type: QR_DATA_TYPES.text, text: '' },
      id,
      revision: (previous.revision ?? 1) + 1,
      updatedAt: now,
      deletedAt: now,
    })
  }
  return next
}

export function isSensitiveQrData(data: QrData): boolean {
  return data.type === QR_DATA_TYPES.otp
}

export function syncableSavedCodes(codes: SavedQrCode[]): SavedQrCode[] {
  return codes.filter((code) => !isSensitiveQrData(code.data))
}

export function serializePersistentSavedCodes(codes: SavedQrCode[]): string {
  return JSON.stringify(syncableSavedCodes(codes).map(normalizeSavedCodeRecord))
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
        hidden: candidate.hidden === true || candidate.hidden === 'true',
      }
    case QR_DATA_TYPES.email:
    case 'EMAIL':
      return {
        type: QR_DATA_TYPES.email,
        email: stringValue(candidate.email),
        subject: stringValue(candidate.subject),
        body: stringValue(candidate.body),
      }
    case QR_DATA_TYPES.phone:
    case 'PHONE':
      return {
        type: QR_DATA_TYPES.phone,
        phone: stringValue(candidate.phone),
      }
    case QR_DATA_TYPES.sms:
    case 'SMS':
      return {
        type: QR_DATA_TYPES.sms,
        phone: stringValue(candidate.phone),
        message: stringValue(candidate.message),
      }
    case QR_DATA_TYPES.location:
    case 'LOCATION':
      return {
        type: QR_DATA_TYPES.location,
        label: stringValue(candidate.label),
        query: stringValue(candidate.query),
        latitude: stringValue(candidate.latitude),
        longitude: stringValue(candidate.longitude),
      }
    case QR_DATA_TYPES.event:
    case 'EVENT':
      return {
        type: QR_DATA_TYPES.event,
        title: stringValue(candidate.title),
        start: stringValue(candidate.start),
        end: stringValue(candidate.end),
        location: stringValue(candidate.location),
        description: stringValue(candidate.description),
      }
    case QR_DATA_TYPES.barcode:
    case 'BARCODE':
      return {
        type: QR_DATA_TYPES.barcode,
        format: stringValue(candidate.format),
        text: stringValue(candidate.text),
      }
    case QR_DATA_TYPES.sepa:
    case 'SEPA':
      return {
        type: QR_DATA_TYPES.sepa,
        recipient: stringValue(candidate.recipient), iban: stringValue(candidate.iban), bic: stringValue(candidate.bic),
        amount: stringValue(candidate.amount), purpose: stringValue(candidate.purpose), reference: stringValue(candidate.reference),
        information: stringValue(candidate.information),
      }
    case QR_DATA_TYPES.whatsapp:
    case 'WHATSAPP':
      return { type: QR_DATA_TYPES.whatsapp, phone: stringValue(candidate.phone), message: stringValue(candidate.message) }
    case QR_DATA_TYPES.deepLink:
    case 'DEEPLINK':
      return { type: QR_DATA_TYPES.deepLink, label: stringValue(candidate.label), url: stringValue(candidate.url) }
    case QR_DATA_TYPES.otp:
    case 'OTP':
      return {
        type: QR_DATA_TYPES.otp, otpType: stringValue(candidate.otpType) || 'totp', issuer: stringValue(candidate.issuer),
        account: stringValue(candidate.account), secret: stringValue(candidate.secret), algorithm: stringValue(candidate.algorithm) || 'SHA1',
        digits: stringValue(candidate.digits) || '6', period: stringValue(candidate.period) || '30', counter: stringValue(candidate.counter),
      }
    case QR_DATA_TYPES.payment:
    case 'PAYMENT':
      return {
        type: QR_DATA_TYPES.payment, provider: stringValue(candidate.provider) || 'PayPal', target: stringValue(candidate.target),
        amount: stringValue(candidate.amount), currency: stringValue(candidate.currency), note: stringValue(candidate.note),
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
  return mergeSavedCodes(parsed.map(parseSavedCode), [])
}

export function parseSavedCode(item: unknown): SavedQrCode {
  if (!item || typeof item !== 'object') throw new Error('Invalid saved code')
  const candidate = item as Record<string, unknown>
  const data = normalizeQrData(candidate.data)
  if (!data || typeof candidate.text !== 'string') throw new Error('Invalid saved code')
  const name = stringValue(candidate.name).trim() || candidate.text
  const createdAt = typeof candidate.createdAt === 'string' && candidate.createdAt.trim() ? candidate.createdAt : undefined
  return normalizeSavedCodeRecord({
    name,
    text: candidate.text,
    data,
    ...(createdAt ? { createdAt } : {}),
    ...(validRecordId(candidate.id) ? { id: candidate.id } : {}),
    ...(validRevision(candidate.revision) ? { revision: candidate.revision } : {}),
    ...(validRecordTime(candidate.updatedAt) ? { updatedAt: candidate.updatedAt } : {}),
    ...(validRecordTime(candidate.deletedAt) ? { deletedAt: candidate.deletedAt } : {}),
  })
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

function encodeUriParameter(value: string): string {
  return encodeURIComponent(value)
    .replaceAll('%20', '+')
    .replaceAll('(', '%28')
    .replaceAll(')', '%29')
}

function appendQuery(base: string, parameters: Array<[string, string]>): string {
  const query = parameters
    .filter(([, value]) => value)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeUriParameter(value)}`)
    .join('&')
  return query ? `${base}?${query}` : base
}

function escapeICal(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\r\n', '\\n')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
}

function unescapeICal(value: string): string {
  return value
    .replace(/\\[nN]/g, '\n')
    .replace(/\\([\\;,])/g, '$1')
}

function formatEventDateTime(value: string): string {
  return value.trim().replaceAll('-', '').replaceAll(':', '')
}

function hasCoordinates(data: LocationData): boolean {
  return Boolean(data.latitude.trim() && data.longitude.trim())
}

function locationQuery(data: LocationData): string {
  return data.query.trim() || data.label.trim()
}

function mapsSearchUrl(query: string): string {
  return appendQuery('https://www.google.com/maps/search/', [['api', '1'], ['query', query]])
}

function escapeWifiValue(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1')
}

function paymentTargetUrl(data: PaymentData): string {
  const target = data.target.trim()
  const provider = data.provider.toLowerCase()
  if (provider === 'bitcoin') {
    return appendQuery(`bitcoin:${target}`, [['amount', data.amount], ['label', data.note]])
  }
  if (provider === 'ethereum') {
    return appendQuery(`ethereum:${target}`, [['value', data.amount]])
  }
  if (/^https?:\/\//i.test(target)) return target
  if (provider === 'paypal') {
    const amount = data.amount ? `/${encodeURIComponent(`${data.amount}${data.currency.toUpperCase()}`)}` : ''
    return `https://paypal.me/${encodeURIComponent(target.replace(/^@/, ''))}${amount}`
  }
  if (provider === 'revolut') return `https://revolut.me/${encodeURIComponent(target.replace(/^@/, ''))}`
  return target
}

export function qrDataAsText(data: QrData): string {
  switch (data.type) {
    case QR_DATA_TYPES.url:
      return data.url
    case QR_DATA_TYPES.text:
      return data.text
    case QR_DATA_TYPES.wifi:
      return `WIFI:T:${escapeWifiValue(data.encryption)};S:${escapeWifiValue(data.ssid)};P:${escapeWifiValue(data.password)};${data.hidden ? 'H:true;' : ''};`
    case QR_DATA_TYPES.email:
      return appendQuery(`mailto:${data.email.trim()}`, [['subject', data.subject], ['body', data.body]])
    case QR_DATA_TYPES.phone:
      return `tel:${data.phone.trim()}`
    case QR_DATA_TYPES.sms:
      return appendQuery(`sms:${data.phone.trim()}`, [['body', data.message]])
    case QR_DATA_TYPES.location: {
      if (hasCoordinates(data)) {
        const coordinates = `${data.latitude.trim()},${data.longitude.trim()}`
        return mapsSearchUrl(coordinates)
      }
      const query = locationQuery(data)
      return query ? mapsSearchUrl(query) : mapsSearchUrl('0,0')
    }
    case QR_DATA_TYPES.event: {
      const lines = ['BEGIN:VEVENT']
      lines.push(`SUMMARY:${escapeICal(data.title || 'Event')}`)
      if (data.start) lines.push(`DTSTART:${formatEventDateTime(data.start)}`)
      if (data.end) lines.push(`DTEND:${formatEventDateTime(data.end)}`)
      if (data.location) lines.push(`LOCATION:${escapeICal(data.location)}`)
      if (data.description) lines.push(`DESCRIPTION:${escapeICal(data.description)}`)
      lines.push('END:VEVENT')
      return lines.join('\n')
    }
    case QR_DATA_TYPES.barcode:
      return data.text
    case QR_DATA_TYPES.sepa:
      return [
        'BCD', '002', '1', 'SCT', data.bic.replaceAll(' ', '').toUpperCase(), data.recipient,
        data.iban.replaceAll(' ', '').toUpperCase(), data.amount ? `EUR${data.amount.replace(',', '.')}` : '',
        data.purpose.toUpperCase(), data.reference, data.reference ? '' : data.information,
      ].join('\n').replace(/\n+$/, '')
    case QR_DATA_TYPES.whatsapp: {
      const phone = data.phone.replace(/\D/g, '')
      return appendQuery(`https://wa.me/${phone}`, [['text', data.message]])
    }
    case QR_DATA_TYPES.deepLink:
      return data.url.trim()
    case QR_DATA_TYPES.otp: {
      const otpType = data.otpType.toLowerCase() === 'hotp' ? 'hotp' : 'totp'
      const label = [data.issuer, data.account].filter(Boolean).map(encodeURIComponent).join(':')
      const parameters: Array<[string, string]> = [
        ['secret', data.secret.replaceAll(' ', '').toUpperCase()], ['issuer', data.issuer],
        ['algorithm', data.algorithm.toUpperCase()], ['digits', data.digits],
      ]
      if (otpType === 'hotp') parameters.push(['counter', data.counter || '0'])
      else parameters.push(['period', data.period || '30'])
      return appendQuery(`otpauth://${otpType}/${label}`, parameters)
    }
    case QR_DATA_TYPES.payment:
      return paymentTargetUrl(data)
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
  if (data.type === QR_DATA_TYPES.email) return data.email || qrDataAsText(data)
  if (data.type === QR_DATA_TYPES.phone) return data.phone || qrDataAsText(data)
  if (data.type === QR_DATA_TYPES.sms) return data.phone || qrDataAsText(data)
  if (data.type === QR_DATA_TYPES.location) return data.label || data.query || [data.latitude, data.longitude].filter(Boolean).join(', ') || 'Maps'
  if (data.type === QR_DATA_TYPES.event) return data.title || 'Event'
  if (data.type === QR_DATA_TYPES.barcode) return data.text
  if (data.type === QR_DATA_TYPES.sepa) return data.recipient || data.iban || 'SEPA payment'
  if (data.type === QR_DATA_TYPES.whatsapp) return data.phone || 'WhatsApp'
  if (data.type === QR_DATA_TYPES.deepLink) return data.label || data.url || 'App link'
  if (data.type === QR_DATA_TYPES.otp) return [data.issuer, data.account].filter(Boolean).join(' · ') || 'Authenticator'
  if (data.type === QR_DATA_TYPES.payment) return [data.provider, data.target].filter(Boolean).join(' · ') || 'Payment'

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

function decodeUriValue(value: string): string {
  try {
    return decodeURIComponent(value.replaceAll('+', ' '))
  } catch {
    return value
  }
}

function decodeUriPathValue(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function parseQueryString(query: string): Record<string, string> {
  return Object.fromEntries(query.replace(/^\?/, '').split('&').map((part) => {
    const separator = part.indexOf('=')
    if (separator < 0) return [decodeUriValue(part), '']
    return [decodeUriValue(part.slice(0, separator)), decodeUriValue(part.slice(separator + 1))]
  }).filter(([key]) => key))
}

function parseMailto(text: string): EmailData | null {
  const match = /^mailto:([^?]*)(\?.*)?$/i.exec(text.trim())
  if (!match) return null
  const parameters = parseQueryString(match[2] ?? '')
  return {
    type: QR_DATA_TYPES.email,
    email: decodeUriPathValue(match[1] ?? ''),
    subject: parameters.subject ?? '',
    body: parameters.body ?? '',
  }
}

function parsePhonePayload(text: string): PhoneData | null {
  const match = /^tel:(.+)$/i.exec(text.trim())
  return match ? { type: QR_DATA_TYPES.phone, phone: decodeUriPathValue(match[1] ?? '') } : null
}

function parseSmsPayload(text: string): SmsData | null {
  const trimmed = text.trim()
  const smsUri = /^sms:([^?]*)(\?.*)?$/i.exec(trimmed)
  if (smsUri) {
    const parameters = parseQueryString(smsUri[2] ?? '')
    return { type: QR_DATA_TYPES.sms, phone: decodeUriPathValue(smsUri[1] ?? ''), message: parameters.body ?? '' }
  }
  const smsto = /^SMSTO:([^:]*):(.*)$/i.exec(trimmed)
  return smsto ? { type: QR_DATA_TYPES.sms, phone: smsto[1] ?? '', message: smsto[2] ?? '' } : null
}

function parseLocationPayload(text: string): LocationData | null {
  const trimmed = text.trim()
  const geo = /^geo:([^,?]+),([^?]+)(?:\?(.*))?$/i.exec(trimmed)
  if (geo) {
    const parameters = parseQueryString(geo[3] ?? '')
    const rawQuery = parameters.q ?? ''
    const labelMatch = /\((.*)\)$/.exec(rawQuery)
    return {
      type: QR_DATA_TYPES.location,
      label: labelMatch?.[1] ?? '',
      query: rawQuery,
      latitude: geo[1] ?? '',
      longitude: geo[2] ?? '',
    }
  }

  try {
    const url = new URL(trimmed)
    if (!/^(www\.)?google\.[^/]+$/i.test(url.hostname) && !/^maps\.app\.goo\.gl$/i.test(url.hostname)) return null
    const query = url.searchParams.get('query') ?? url.searchParams.get('q') ?? ''
    if (!query && !url.pathname.includes('/maps')) return null
    return { type: QR_DATA_TYPES.location, label: query, query, latitude: '', longitude: '' }
  } catch {
    return null
  }
}

function parseEventPayload(text: string): EventData | null {
  const trimmed = text.trim()
  if (!/\bBEGIN:VEVENT\b/i.test(trimmed)) return null
  const data: EventData = { type: QR_DATA_TYPES.event, title: '', start: '', end: '', location: '', description: '' }
  let hasField = false

  for (const rawLine of unfoldVCard(trimmed)) {
    const line = rawLine.trim()
    const separator = line.indexOf(':')
    if (separator < 0) continue
    const key = line.slice(0, separator).split(';')[0].toUpperCase()
    const value = unescapeICal(line.slice(separator + 1))
    switch (key) {
      case 'SUMMARY': data.title = value; break
      case 'DTSTART': data.start = value; break
      case 'DTEND': data.end = value; break
      case 'LOCATION': data.location = value; break
      case 'DESCRIPTION': data.description = value; break
      default: continue
    }
    hasField ||= Boolean(value)
  }

  return hasField ? data : null
}

function splitEscaped(value: string, separator: string, preserveEscapes = false): string[] {
  const parts: string[] = []
  let current = ''
  let escaped = false
  for (const character of value) {
    if (escaped) {
      current += preserveEscapes ? `\\${character}` : character
      escaped = false
    } else if (character === '\\') {
      escaped = true
    } else if (character === separator) {
      parts.push(current)
      current = ''
    } else {
      current += character
    }
  }
  parts.push(escaped ? `${current}\\` : current)
  return parts
}

function parseWifiPayload(text: string): WifiData | null {
  if (!/^WIFI:/i.test(text.trim())) return null
  const fields = Object.fromEntries(splitEscaped(text.trim().slice(5), ';', true).map((part) => {
    const separator = part.indexOf(':')
    if (separator < 0) return ['', '']
    return [part.slice(0, separator).toUpperCase(), splitEscaped(part.slice(separator + 1), ':').join(':')]
  }).filter(([key]) => key))
  return {
    type: QR_DATA_TYPES.wifi,
    ssid: fields.S ?? '', password: fields.P ?? '', encryption: fields.T ?? 'WPA', hidden: fields.H?.toLowerCase() === 'true',
  }
}

function parseSepaPayload(text: string): SepaData | null {
  const lines = text.trim().split(/\r?\n/)
  if (lines[0] !== 'BCD' || lines[3] !== 'SCT') return null
  return {
    type: QR_DATA_TYPES.sepa,
    bic: lines[4] ?? '', recipient: lines[5] ?? '', iban: lines[6] ?? '', amount: (lines[7] ?? '').replace(/^EUR/i, ''),
    purpose: lines[8] ?? '', reference: lines[9] ?? '', information: lines[10] ?? '',
  }
}

function parseWhatsAppPayload(text: string): WhatsAppData | null {
  try {
    const url = new URL(text.trim())
    if (!/^(wa\.me|api\.whatsapp\.com)$/i.test(url.hostname)) return null
    return {
      type: QR_DATA_TYPES.whatsapp,
      phone: url.hostname.toLowerCase() === 'wa.me' ? url.pathname.replace(/^\//, '') : url.searchParams.get('phone') ?? '',
      message: url.searchParams.get('text') ?? '',
    }
  } catch {
    return null
  }
}

function parseOtpPayload(text: string): OtpData | null {
  try {
    const url = new URL(text.trim())
    if (url.protocol !== 'otpauth:' || !['totp', 'hotp'].includes(url.hostname.toLowerCase())) return null
    const label = decodeUriPathValue(url.pathname.replace(/^\//, ''))
    const separator = label.indexOf(':')
    const issuerFromLabel = separator >= 0 ? label.slice(0, separator).trim() : ''
    const account = separator >= 0 ? label.slice(separator + 1).trim() : label
    return {
      type: QR_DATA_TYPES.otp, otpType: url.hostname.toLowerCase(), issuer: url.searchParams.get('issuer') ?? issuerFromLabel,
      account, secret: url.searchParams.get('secret') ?? '', algorithm: url.searchParams.get('algorithm') ?? 'SHA1',
      digits: url.searchParams.get('digits') ?? '6', period: url.searchParams.get('period') ?? '30', counter: url.searchParams.get('counter') ?? '',
    }
  } catch {
    return null
  }
}

function parsePaymentPayload(text: string): PaymentData | null {
  const trimmed = text.trim()
  const match = /^(bitcoin|ethereum):([^?]+)(?:\?(.*))?$/i.exec(trimmed)
  if (!match) return null
  const parameters = parseQueryString(match[3] ?? '')
  return {
    type: QR_DATA_TYPES.payment, provider: match[1][0].toUpperCase() + match[1].slice(1).toLowerCase(), target: decodeUriPathValue(match[2]),
    amount: parameters.amount ?? parameters.value ?? '', currency: '', note: parameters.label ?? parameters.message ?? '',
  }
}

export function parseQrPayload(text: string): QrData | null {
  return parseVCard(text)
    ?? parseEventPayload(text)
    ?? parseWifiPayload(text)
    ?? parseSepaPayload(text)
    ?? parseOtpPayload(text)
    ?? parseWhatsAppPayload(text)
    ?? parsePaymentPayload(text)
    ?? parseMailto(text)
    ?? parsePhonePayload(text)
    ?? parseSmsPayload(text)
    ?? parseLocationPayload(text)
}

export type Translate = (id: string, args?: Record<string, string | number>) => string

export function formatQrData(data: QrData, translate: Translate): string {
  if (data.type === QR_DATA_TYPES.url) return data.url
  if (data.type === QR_DATA_TYPES.text) return data.text
  if (data.type === QR_DATA_TYPES.email) {
    return [
      translate('default-email-label', { value: data.email }),
      data.subject ? translate('default-subject-label', { value: data.subject }) : '',
      data.body ? translate('default-body-label', { value: data.body }) : '',
    ].filter(Boolean).join('\n')
  }
  if (data.type === QR_DATA_TYPES.phone) return translate('default-phone-label', { value: data.phone })
  if (data.type === QR_DATA_TYPES.sms) {
    return [
      translate('default-phone-label', { value: data.phone }),
      data.message ? translate('default-message-label', { value: data.message }) : '',
    ].filter(Boolean).join('\n')
  }
  if (data.type === QR_DATA_TYPES.location) {
    return [
      data.label ? translate('default-label-label', { value: data.label }) : '',
      locationQuery(data) ? translate('default-map-query-label', { value: locationQuery(data) }) : '',
      hasCoordinates(data) ? translate('default-coordinates-label', { value: `${data.latitude}, ${data.longitude}` }) : '',
    ].filter(Boolean).join('\n')
  }
  if (data.type === QR_DATA_TYPES.event) {
    return [
      translate('default-title-label', { value: data.title }),
      data.start ? translate('default-start-label', { value: data.start }) : '',
      data.end ? translate('default-end-label', { value: data.end }) : '',
      data.location ? translate('default-location-label', { value: data.location }) : '',
      data.description ? translate('default-description-label', { value: data.description }) : '',
    ].filter(Boolean).join('\n')
  }
  if (data.type === QR_DATA_TYPES.barcode) {
    return [
      translate('default-type-label', { value: data.format }),
      data.text,
    ].join('\n')
  }
  if (data.type === QR_DATA_TYPES.sepa) {
    return [
      `Recipient: ${data.recipient}`, `IBAN: ${data.iban}`, data.bic ? `BIC: ${data.bic}` : '',
      data.amount ? `Amount: EUR ${data.amount}` : '', data.reference ? `Reference: ${data.reference}` : '',
      data.information ? `Information: ${data.information}` : '',
    ].filter(Boolean).join('\n')
  }
  if (data.type === QR_DATA_TYPES.whatsapp) return [data.phone, data.message].filter(Boolean).join('\n')
  if (data.type === QR_DATA_TYPES.deepLink) return [data.label, data.url].filter(Boolean).join('\n')
  if (data.type === QR_DATA_TYPES.otp) {
    return [`Type: ${data.otpType.toUpperCase()}`, `Issuer: ${data.issuer}`, `Account: ${data.account}`, 'Secret: ••••••••'].filter(Boolean).join('\n')
  }
  if (data.type === QR_DATA_TYPES.payment) {
    return [data.provider, data.target, data.amount ? `${data.amount} ${data.currency}`.trim() : '', data.note].filter(Boolean).join('\n')
  }
  if (data.type === QR_DATA_TYPES.wifi) {
    return [
      translate('default-ssid-label', { value: data.ssid }),
      translate('default-password-label', { value: data.password }),
      translate('default-type-label', { value: data.encryption }),
      data.hidden ? 'Hidden network: Yes' : '',
    ].filter(Boolean).join('\n')
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
