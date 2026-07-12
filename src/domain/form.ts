import { QR_DATA_TYPES, type QrData, type QrType, type SavedQrCode, defaultDisplayName, parseQrPayload, qrDataAsText } from './qr'

export interface QrFormState {
  name: string
  type: QrType
  url: string
  text: string
  ssid: string
  password: string
  encryption: string
  email: string
  emailSubject: string
  emailBody: string
  phone: string
  smsPhone: string
  smsMessage: string
  locationLabel: string
  locationQuery: string
  locationLatitude: string
  locationLongitude: string
  eventTitle: string
  eventStart: string
  eventEnd: string
  eventLocation: string
  eventDescription: string
  vcardFullName: string
  vcardFirstName: string
  vcardLastName: string
  vcardAdditionalNames: string
  vcardPrefix: string
  vcardSuffix: string
  vcardNickname: string
  vcardTitle: string
  vcardOrganization: string
  vcardEmail: string
  vcardEmailType: string
  vcardPhone: string
  vcardPhoneType: string
  vcardUrl: string
  vcardStreet: string
  vcardCity: string
  vcardRegion: string
  vcardPostalCode: string
  vcardCountry: string
  vcardNote: string
}

export function emptyQrForm(): QrFormState {
  return {
    name: '', type: 'URL', url: '', text: '', ssid: '', password: '', encryption: 'WPA',
    email: '', emailSubject: '', emailBody: '', phone: '', smsPhone: '', smsMessage: '',
    locationLabel: '', locationQuery: '', locationLatitude: '', locationLongitude: '',
    eventTitle: '', eventStart: '', eventEnd: '', eventLocation: '', eventDescription: '',
    vcardFullName: '', vcardFirstName: '', vcardLastName: '', vcardAdditionalNames: '',
    vcardPrefix: '', vcardSuffix: '', vcardNickname: '', vcardTitle: '', vcardOrganization: '',
    vcardEmail: '', vcardEmailType: 'INTERNET', vcardPhone: '', vcardPhoneType: '', vcardUrl: '',
    vcardStreet: '', vcardCity: '', vcardRegion: '', vcardPostalCode: '', vcardCountry: '', vcardNote: '',
  }
}

export function formToQrData(form: QrFormState): QrData {
  switch (form.type) {
    case 'URL': return { type: QR_DATA_TYPES.url, url: form.url }
    case 'TEXT': return { type: QR_DATA_TYPES.text, text: form.text }
    case 'WIFI': return { type: QR_DATA_TYPES.wifi, ssid: form.ssid, password: form.password, encryption: form.encryption }
    case 'EMAIL': return { type: QR_DATA_TYPES.email, email: form.email, subject: form.emailSubject, body: form.emailBody }
    case 'PHONE': return { type: QR_DATA_TYPES.phone, phone: form.phone }
    case 'SMS': return { type: QR_DATA_TYPES.sms, phone: form.smsPhone, message: form.smsMessage }
    case 'LOCATION': return {
      type: QR_DATA_TYPES.location,
      label: form.locationLabel,
      query: form.locationQuery,
      latitude: form.locationLatitude,
      longitude: form.locationLongitude,
    }
    case 'EVENT': return {
      type: QR_DATA_TYPES.event,
      title: form.eventTitle,
      start: form.eventStart,
      end: form.eventEnd,
      location: form.eventLocation,
      description: form.eventDescription,
    }
    case 'VCARD': return {
      type: QR_DATA_TYPES.vcard,
      name: form.vcardFullName,
      firstName: form.vcardFirstName,
      lastName: form.vcardLastName,
      additionalNames: form.vcardAdditionalNames,
      prefix: form.vcardPrefix,
      suffix: form.vcardSuffix,
      nickname: form.vcardNickname,
      title: form.vcardTitle,
      organization: form.vcardOrganization,
      email: form.vcardEmail,
      emailType: form.vcardEmailType,
      phone: form.vcardPhone,
      phoneType: form.vcardPhoneType,
      url: form.vcardUrl,
      street: form.vcardStreet,
      city: form.vcardCity,
      region: form.vcardRegion,
      postalCode: form.vcardPostalCode,
      country: form.vcardCountry,
      note: form.vcardNote,
    }
  }
}

function textToForm(name: string, text: string): QrFormState {
  const form = emptyQrForm()
  if (text.startsWith('WIFI:')) {
    const parameters = Object.fromEntries(text.slice(5).split(';').map((part) => {
      const index = part.indexOf(':')
      return index > 0 ? [part.slice(0, index), part.slice(index + 1)] : ['', '']
    }))
    return { ...form, name, type: 'WIFI', ssid: parameters.S ?? '', password: parameters.P ?? '', encryption: parameters.T ?? 'WPA' }
  }
  const payload = parseQrPayload(text)
  if (payload) return dataToForm(name || defaultDisplayName(payload), payload)
  if (/^https?:\/\//.test(text)) return { ...form, name, type: 'URL', url: text }
  return { ...form, name, type: 'TEXT', text }
}

export function dataToForm(name: string, data: QrData): QrFormState {
  const form = emptyQrForm()
  switch (data.type) {
    case QR_DATA_TYPES.url: return { ...form, name, type: 'URL', url: data.url }
    case QR_DATA_TYPES.text: return textToForm(name, data.text)
    case QR_DATA_TYPES.barcode: return { ...form, name, type: 'TEXT', text: data.text }
    case QR_DATA_TYPES.wifi: return { ...form, name, type: 'WIFI', ssid: data.ssid, password: data.password, encryption: data.encryption }
    case QR_DATA_TYPES.email: return { ...form, name: name || defaultDisplayName(data), type: 'EMAIL', email: data.email, emailSubject: data.subject, emailBody: data.body }
    case QR_DATA_TYPES.phone: return { ...form, name: name || defaultDisplayName(data), type: 'PHONE', phone: data.phone }
    case QR_DATA_TYPES.sms: return { ...form, name: name || defaultDisplayName(data), type: 'SMS', smsPhone: data.phone, smsMessage: data.message }
    case QR_DATA_TYPES.location: return {
      ...form, name: name || defaultDisplayName(data), type: 'LOCATION',
      locationLabel: data.label, locationQuery: data.query,
      locationLatitude: data.latitude, locationLongitude: data.longitude,
    }
    case QR_DATA_TYPES.event: return {
      ...form, name: name || defaultDisplayName(data), type: 'EVENT',
      eventTitle: data.title, eventStart: data.start, eventEnd: data.end,
      eventLocation: data.location, eventDescription: data.description,
    }
    case QR_DATA_TYPES.vcard: return {
      ...form, name: name || defaultDisplayName(data), type: 'VCARD',
      vcardFullName: data.name, vcardFirstName: data.firstName, vcardLastName: data.lastName,
      vcardAdditionalNames: data.additionalNames, vcardPrefix: data.prefix, vcardSuffix: data.suffix,
      vcardNickname: data.nickname, vcardTitle: data.title, vcardOrganization: data.organization,
      vcardEmail: data.email, vcardEmailType: data.emailType, vcardPhone: data.phone,
      vcardPhoneType: data.phoneType, vcardUrl: data.url, vcardStreet: data.street,
      vcardCity: data.city, vcardRegion: data.region, vcardPostalCode: data.postalCode,
      vcardCountry: data.country, vcardNote: data.note,
    }
  }
}

export function formToSavedCode(form: QrFormState, createdAt: string | null | undefined = new Date().toISOString()): SavedQrCode {
  const data = formToQrData(form)
  const savedCode = { name: form.name.trim() || defaultDisplayName(data), text: qrDataAsText(data), data }
  return createdAt ? { ...savedCode, createdAt } : savedCode
}
