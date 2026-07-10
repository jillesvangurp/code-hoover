import { QR_DATA_TYPES, type QrData, type QrType, type SavedQrCode, defaultDisplayName, parseVCard, qrDataAsText } from './qr'

export interface QrFormState {
  name: string
  type: QrType
  url: string
  text: string
  ssid: string
  password: string
  encryption: string
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
  if (/^https?:\/\//.test(text)) return { ...form, name, type: 'URL', url: text }
  const vcard = parseVCard(text)
  return vcard ? dataToForm(name || defaultDisplayName(vcard), vcard) : { ...form, name, type: 'TEXT', text }
}

export function dataToForm(name: string, data: QrData): QrFormState {
  const form = emptyQrForm()
  switch (data.type) {
    case QR_DATA_TYPES.url: return { ...form, name, type: 'URL', url: data.url }
    case QR_DATA_TYPES.text: return textToForm(name, data.text)
    case QR_DATA_TYPES.wifi: return { ...form, name, type: 'WIFI', ssid: data.ssid, password: data.password, encryption: data.encryption }
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

export function formToSavedCode(form: QrFormState): SavedQrCode {
  const data = formToQrData(form)
  return { name: form.name.trim() || defaultDisplayName(data), text: qrDataAsText(data), data }
}
