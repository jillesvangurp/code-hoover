import { useCallback, useState } from 'react'
import { Building2, Globe, Mail, MapPin, Phone, Trash2, UserRound, X } from 'lucide-react'
import { dataToForm, formToQrData, formToSavedCode, type QrFormState } from '../domain/form'
import { QR_DATA_TYPES, formatQrData, qrDataAsText, type SavedQrCode, type VCardData } from '../domain/qr'
import { useI18n } from '../i18n/context'
import { useModalHistory } from '../hooks/useModalHistory'
import { BarcodeImage } from './BarcodeImage'
import { FormButtons, QrForm } from './QrForm'
import { QrIntroFrame } from './QrIntroFrame'

interface CodeModalProps {
  code: SavedQrCode
  onSave: (code: SavedQrCode) => void
  onDelete: () => void
  onClose: () => void
}

function compactName(data: VCardData, fallback: string): string {
  const structured = [data.prefix, data.firstName, data.additionalNames, data.lastName, data.suffix].filter(Boolean).join(' ').trim()
  return data.name.trim() || structured || data.nickname.trim() || data.organization.trim() || fallback.replace(/\s*vcard$/i, '').trim() || fallback
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
  return initials.toUpperCase()
}

function BusinessCardPreview({ data, codeName }: { data: VCardData; codeName: string }) {
  const displayName = compactName(data, codeName)
  const role = [data.title, data.organization].filter(Boolean).join(' · ')
  const address = [data.street, data.city, data.region, data.postalCode, data.country].filter(Boolean).join(', ')
  const contactRows = [
    data.phone && { icon: Phone, value: data.phone },
    data.email && { icon: Mail, value: data.email },
    data.url && { icon: Globe, value: data.url.replace(/^https?:\/\//, '') },
    address && { icon: MapPin, value: address },
  ].filter(Boolean) as Array<{ icon: typeof Phone; value: string }>

  return (
    <section className="mx-auto w-full max-w-xl" aria-label={displayName}>
      <div className="flex min-h-80 flex-col justify-between overflow-hidden rounded-lg border border-base-300 bg-base-100 p-5 text-base-content shadow-xl sm:aspect-[1.586/1] sm:min-h-72 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-neutral text-base font-bold text-neutral-content">
              {initialsFor(displayName)}
            </div>
            <div className="min-w-0">
              <p className="m-0 truncate text-sm font-semibold">{data.organization || data.nickname || codeName}</p>
              <p className="m-0 truncate text-xs opacity-70">{data.nickname || data.title || 'vCard'}</p>
            </div>
          </div>
          <UserRound className="shrink-0 opacity-70" size={24} aria-hidden="true" />
        </div>

        <div className="min-w-0 py-4">
          <h2 className="m-0 break-words text-3xl font-bold leading-tight sm:text-4xl">{displayName}</h2>
          {role && <p className="m-0 mt-2 break-words text-sm font-medium opacity-80">{role}</p>}
          {data.note && <p className="m-0 mt-3 line-clamp-2 break-words text-xs opacity-70">{data.note}</p>}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_4.75rem] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_7rem] sm:gap-4">
          <div className="min-w-0 space-y-1.5">
            {data.organization && !role.includes(data.organization) && (
              <p className="m-0 flex min-w-0 items-center gap-2 text-xs opacity-80">
                <Building2 size={14} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{data.organization}</span>
              </p>
            )}
            {contactRows.slice(0, 4).map(({ icon: Icon, value }) => (
              <p key={value} className="m-0 flex min-w-0 items-center gap-2 text-xs opacity-80">
                <Icon size={14} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{value}</span>
              </p>
            ))}
          </div>
          <div className="rounded-md border border-base-300 bg-white p-1.5">
            <QrIntroFrame text={qrDataAsText(data)} size={160} className="rounded-none" style={{ width: '100%', height: 'auto', aspectRatio: '1 / 1' }} label={displayName} />
          </div>
        </div>
      </div>
    </section>
  )
}

export function CodeModal({ code, onSave, onDelete, onClose }: CodeModalProps) {
  const [form, setForm] = useState<QrFormState>(() => dataToForm(code.name, code.data))
  const { t } = useI18n()
  const close = useCallback(() => onClose(), [onClose])
  useModalHistory(true, close)
  const data = formToQrData(form)
  const barcodeData = code.data.type === QR_DATA_TYPES.barcode ? code.data : null
  const isVCard = data.type === QR_DATA_TYPES.vcard

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label={code.name}>
      <div className="modal-box relative h-full w-full max-w-full space-y-5 overflow-y-auto">
        <button type="button" className="btn btn-ghost btn-sm btn-circle absolute right-4 top-4 z-10" aria-label={t('default-close')} onClick={() => { onClose(); history.back() }}><X /></button>
        {barcodeData ? (
          <>
            <div className="mx-auto flex w-full max-w-2xl items-center justify-center bg-white p-5">
              <BarcodeImage format={barcodeData.format} text={barcodeData.text} fallbackSize={500} className="max-h-[60vh] max-w-full object-contain" alt={code.name || code.text} />
            </div>
            <pre className="mx-auto max-w-sm whitespace-pre-wrap break-words text-left">{formatQrData(barcodeData, t)}</pre>
            <div className="modal-action justify-center md:justify-end">
              <button type="button" className="btn btn-warning btn-sm" onClick={() => { onDelete(); onClose(); history.back() }}><Trash2 size={16} />{t('default-delete')}</button>
            </div>
          </>
        ) : (
          <>
            {isVCard && <BusinessCardPreview data={data} codeName={code.name} />}
            <QrIntroFrame text={qrDataAsText(data)} size={500} className={`qr-detail-code-frame ${isVCard ? 'qr-detail-code-frame-vcard' : ''}`} label={code.name || code.text} />
            <pre className="mx-auto max-w-sm whitespace-pre-wrap break-words text-left">{formatQrData(data, t)}</pre>
            <div className="mx-auto flex w-full max-w-sm flex-col gap-2"><QrForm form={form} onChange={setForm} showTypeSelect={false} /></div>
            <FormButtons
              className="modal-action justify-center md:justify-end"
              onSave={() => { onSave(formToSavedCode(form)); onClose(); history.back() }}
              onDelete={() => { onDelete(); onClose(); history.back() }}
            />
          </>
        )}
      </div>
    </div>
  )
}
