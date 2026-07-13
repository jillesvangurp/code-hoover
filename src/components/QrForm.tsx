import type { ChangeEvent } from 'react'
import { Check, Copy, Trash2, X } from 'lucide-react'
import type { QrFormState } from '../domain/form'
import type { QrType } from '../domain/qr'
import { BARCODE_FORMAT_NAMES, barcodeRendererId } from '../domain/barcode'
import { useI18n } from '../i18n/context'

interface QrFormProps {
  form: QrFormState
  onChange: (form: QrFormState) => void
  showTypeSelect?: boolean
}

type FieldName = keyof QrFormState

export function QrForm({ form, onChange, showTypeSelect = true }: QrFormProps) {
  const { t } = useI18n()
  const update = (field: FieldName) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = event.target.value
    const next = { ...form, [field]: value }
    if (field === 'vcardFullName' && form.type === 'VCARD') {
      const previousDefault = form.vcardFullName ? `${form.vcardFullName} vcard` : ''
      if (!form.name || form.name === previousDefault) next.name = value ? `${value} vcard` : ''
    }
    onChange(next)
  }

  const input = (field: FieldName, translationId: string, rows = 1) => rows > 1 ? (
    <textarea className="textarea textarea-bordered w-full" rows={rows} placeholder={t(translationId)} value={String(form[field])} onChange={update(field)} />
  ) : (
    <input className="input input-bordered w-full" placeholder={t(translationId)} value={String(form[field])} onChange={update(field)} />
  )

  const select = (field: FieldName, translationId: string, options: string[]) => (
    <label className="form-control w-full">
      <span className="label-text mb-1 text-xs font-semibold opacity-70">{t(translationId)}</span>
      <select className="select select-bordered w-full" value={String(form[field])} onChange={update(field)}>
        {options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}
      </select>
    </label>
  )

  const labeledInput = (field: FieldName, translationId: string, rows = 1, type = 'text') => (
    <label className="form-control w-full">
      <span className="label-text mb-1 text-xs font-semibold opacity-70">{t(translationId)}</span>
      {rows > 1 ? (
        <textarea className="textarea textarea-bordered w-full" rows={rows} value={String(form[field])} onChange={update(field)} />
      ) : (
        <input className="input input-bordered w-full" type={type} autoComplete={type === 'password' ? 'off' : undefined} value={String(form[field])} onChange={update(field)} />
      )}
    </label>
  )

  return (
    <div className="flex w-full flex-col gap-2">
      <input
        className="input input-bordered w-full"
        placeholder={form.type === 'VCARD' && form.vcardFullName ? `${form.vcardFullName} vcard` : t('default-name')}
        value={form.name}
        onChange={update('name')}
      />
      {showTypeSelect && (
        <select className="select select-bordered w-full" value={form.type} onChange={update('type')}>
          {(['URL', 'TEXT', 'VCARD', 'WIFI', 'EMAIL', 'PHONE', 'SMS', 'WHATSAPP', 'LOCATION', 'EVENT', 'BARCODE', 'SEPA', 'DEEPLINK', 'PAYMENT', 'OTP'] as QrType[]).map((type) => (
            <option key={type} value={type}>{t(`default-${type === 'VCARD' ? 'v-card' : type === 'LOCATION' ? 'maps' : type === 'DEEPLINK' ? 'app-link' : type === 'OTP' ? 'authenticator' : type.toLowerCase()}`)}</option>
          ))}
        </select>
      )}
      {form.type === 'URL' && input('url', 'default-url')}
      {form.type === 'TEXT' && input('text', 'default-text', 4)}
      {form.type === 'WIFI' && <>
        {input('ssid', 'default-ssid')}
        {input('password', 'default-password')}
        {select('encryption', 'default-encryption', ['WPA', 'WEP', 'nopass'])}
        <label className="label cursor-pointer justify-start gap-3 rounded-lg border border-base-300 px-3 py-2">
          <input type="checkbox" className="checkbox checkbox-sm" checked={form.wifiHidden} onChange={(event) => onChange({ ...form, wifiHidden: event.target.checked })} />
          <span className="label-text">{t('default-hidden-network')}</span>
        </label>
      </>}
      {form.type === 'EMAIL' && <>
        {input('email', 'default-email')}
        {input('emailSubject', 'default-subject')}
        {input('emailBody', 'default-body', 4)}
      </>}
      {form.type === 'PHONE' && input('phone', 'default-phone')}
      {form.type === 'SMS' && <>
        {input('smsPhone', 'default-phone')}
        {input('smsMessage', 'default-message', 3)}
      </>}
      {form.type === 'WHATSAPP' && <>
        {labeledInput('whatsappPhone', 'default-phone')}
        {labeledInput('whatsappMessage', 'default-message', 3)}
      </>}
      {form.type === 'LOCATION' && <>
        {input('locationLabel', 'default-map-label')}
        {input('locationQuery', 'default-map-query')}
        <div className="grid gap-2 sm:grid-cols-2">
          {input('locationLatitude', 'default-latitude')}
          {input('locationLongitude', 'default-longitude')}
        </div>
      </>}
      {form.type === 'EVENT' && <>
        {input('eventTitle', 'default-event-title')}
        {input('eventStart', 'default-start')}
        {input('eventEnd', 'default-end')}
        {input('eventLocation', 'default-location')}
        {input('eventDescription', 'default-description', 3)}
      </>}
      {form.type === 'BARCODE' && <>
        {select('barcodeFormat', 'default-barcode-format', BARCODE_FORMAT_NAMES.filter((format) => format !== 'QR_CODE' && barcodeRendererId(format))) }
        {labeledInput('barcodeText', 'default-barcode-value')}
      </>}
      {form.type === 'SEPA' && <>
        {labeledInput('sepaRecipient', 'default-recipient')}
        {labeledInput('sepaIban', 'default-iban')}
        {labeledInput('sepaBic', 'default-bic')}
        <div className="grid gap-2 sm:grid-cols-2">
          {labeledInput('sepaAmount', 'default-amount-eur')}
          {labeledInput('sepaPurpose', 'default-purpose-code')}
        </div>
        {labeledInput('sepaReference', 'default-payment-reference')}
        {labeledInput('sepaInformation', 'default-payment-information')}
      </>}
      {form.type === 'DEEPLINK' && <>
        {labeledInput('deepLinkLabel', 'default-link-label')}
        {labeledInput('deepLinkUrl', 'default-app-link-url')}
      </>}
      {form.type === 'PAYMENT' && <>
        {select('paymentProvider', 'default-payment-provider', ['PayPal', 'Revolut', 'Bitcoin', 'Ethereum', 'Other'])}
        {labeledInput('paymentTarget', 'default-payment-target')}
        <div className="grid gap-2 sm:grid-cols-2">
          {labeledInput('paymentAmount', 'default-amount')}
          {labeledInput('paymentCurrency', 'default-currency')}
        </div>
        {labeledInput('paymentNote', 'default-note')}
      </>}
      {form.type === 'OTP' && <>
        <div role="alert" className="alert alert-warning py-3 text-sm">
          <span>{t('default-authenticator-local-only')}</span>
        </div>
        {select('otpType', 'default-authenticator-type', ['totp', 'hotp'])}
        {labeledInput('otpIssuer', 'default-issuer')}
        {labeledInput('otpAccount', 'default-account')}
        {labeledInput('otpSecret', 'default-secret', 1, 'password')}
        <div className="grid gap-2 sm:grid-cols-3">
          {select('otpAlgorithm', 'default-algorithm', ['SHA1', 'SHA256', 'SHA512'])}
          {select('otpDigits', 'default-digits', ['6', '8'])}
          {form.otpType === 'hotp' ? labeledInput('otpCounter', 'default-counter') : labeledInput('otpPeriod', 'default-period-seconds')}
        </div>
      </>}
      {form.type === 'VCARD' && <>
        {input('vcardFullName', 'default-full-name')}
        {input('vcardFirstName', 'default-first-name')}
        {input('vcardLastName', 'default-last-name')}
        {input('vcardAdditionalNames', 'default-additional-names')}
        {input('vcardPrefix', 'default-name-prefix')}
        {input('vcardSuffix', 'default-name-suffix')}
        {input('vcardNickname', 'default-nickname')}
        {input('vcardTitle', 'default-title')}
        {input('vcardOrganization', 'default-organization')}
        {input('vcardEmail', 'default-email')}
        {input('vcardEmailType', 'default-email-type')}
        {input('vcardPhone', 'default-phone')}
        {input('vcardPhoneType', 'default-phone-type')}
        {input('vcardUrl', 'default-url')}
        {input('vcardStreet', 'default-street')}
        {input('vcardCity', 'default-city')}
        {input('vcardRegion', 'default-region')}
        {input('vcardPostalCode', 'default-postal-code')}
        {input('vcardCountry', 'default-country')}
        {input('vcardNote', 'default-note', 3)}
      </>}
    </div>
  )
}

interface FormButtonsProps {
  onSave: () => void
  onCopy?: () => void
  onCancel?: () => void
  onDelete?: () => void
  className?: string
}

export function FormButtons({ onSave, onCopy, onCancel, onDelete, className = '' }: FormButtonsProps) {
  const { t } = useI18n()
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button type="button" className="btn btn-primary btn-sm" onClick={onSave}><Check size={16} />{t('default-save')}</button>
      {onCopy && <button type="button" className="btn btn-secondary btn-sm" onClick={onCopy}><Copy size={16} />{t('default-copy')}</button>}
      {onCancel && <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}><X size={16} />{t('default-cancel')}</button>}
      {onDelete && <button type="button" className="btn btn-error btn-sm" onClick={onDelete}><Trash2 size={16} />{t('default-delete')}</button>}
    </div>
  )
}
