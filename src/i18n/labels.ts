import { QR_DATA_TYPES, type QrData } from '../domain/qr'

type Translate = (id: string, args?: Record<string, string | number>) => string

export function localizedCodeFamilyLabel(data: QrData, t: Translate): string {
  return t(data.type === QR_DATA_TYPES.barcode ? 'default-barcode' : 'default-qr-code')
}

export function localizedCodePayloadTypeLabel(data: QrData, t: Translate): string {
  if (data.type === QR_DATA_TYPES.barcode) return data.format || t('default-barcode')
  const ids: Record<Exclude<QrData['type'], typeof QR_DATA_TYPES.barcode>, string> = {
    [QR_DATA_TYPES.url]: 'default-url',
    [QR_DATA_TYPES.text]: 'default-text',
    [QR_DATA_TYPES.wifi]: 'default-wifi',
    [QR_DATA_TYPES.email]: 'default-email',
    [QR_DATA_TYPES.phone]: 'default-phone',
    [QR_DATA_TYPES.sms]: 'default-sms',
    [QR_DATA_TYPES.location]: 'default-maps',
    [QR_DATA_TYPES.event]: 'default-event',
    [QR_DATA_TYPES.vcard]: 'default-v-card',
    [QR_DATA_TYPES.sepa]: 'default-sepa',
    [QR_DATA_TYPES.whatsapp]: 'default-whatsapp',
    [QR_DATA_TYPES.deepLink]: 'default-app-link',
    [QR_DATA_TYPES.otp]: 'default-authenticator',
    [QR_DATA_TYPES.payment]: 'default-payment',
  }
  return t(ids[data.type])
}
