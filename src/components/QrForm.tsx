import type { ChangeEvent } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import type { QrFormState } from '../domain/form'
import type { QrType } from '../domain/qr'
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
          {(['URL', 'TEXT', 'VCARD', 'WIFI'] as QrType[]).map((type) => (
            <option key={type} value={type}>{t(`default-${type === 'VCARD' ? 'v-card' : type.toLowerCase()}`)}</option>
          ))}
        </select>
      )}
      {form.type === 'URL' && input('url', 'default-url')}
      {form.type === 'TEXT' && input('text', 'default-text', 4)}
      {form.type === 'WIFI' && <>
        {input('ssid', 'default-ssid')}
        {input('password', 'default-password')}
        {input('encryption', 'default-encryption')}
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
  onCancel?: () => void
  onDelete?: () => void
  className?: string
}

export function FormButtons({ onSave, onCancel, onDelete, className = '' }: FormButtonsProps) {
  const { t } = useI18n()
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button type="button" className="btn btn-primary btn-sm" onClick={onSave}><Check size={16} />{t('default-save')}</button>
      {onCancel && <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}><X size={16} />{t('default-cancel')}</button>}
      {onDelete && <button type="button" className="btn btn-warning btn-sm" onClick={onDelete}><Trash2 size={16} />{t('default-delete')}</button>}
    </div>
  )
}
