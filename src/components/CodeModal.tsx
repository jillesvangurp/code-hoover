import { useCallback, useState } from 'react'
import { ArrowLeft, Building2, Check, Copy, Globe, Mail, MapPin, Phone, Trash2, UserRound } from 'lucide-react'
import { dataToForm, formToQrData, formToSavedCode, type QrFormState } from '../domain/form'
import { QR_DATA_TYPES, formatQrData, qrDataAsText, type SavedQrCode, type VCardData } from '../domain/qr'
import { useI18n } from '../i18n/context'
import { useModalHistory } from '../hooks/useModalHistory'
import { BarcodeImage } from './BarcodeImage'
import { FormButtons, QrForm } from './QrForm'
import { QrIntroFrame } from './QrIntroFrame'
import { UrlPreview } from './UrlPreview'

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

function detailRowsFor(data: VCardData, codeName: string) {
  const address = [data.street, data.city, data.region, data.postalCode, data.country].filter(Boolean).join(', ')
  return [
    ['Card name', codeName],
    ['Name', compactName(data, codeName)],
    ['Title', data.title],
    ['Organization', data.organization],
    ['Email', data.email],
    ['Phone', data.phone],
    ['URL', data.url],
    ['Address', address],
    ['Nickname', data.nickname],
    ['Note', data.note],
  ].filter((row): row is [string, string] => Boolean(row[1]))
}

function VCardDetails({ data, codeName }: { data: VCardData; codeName: string }) {
  const rows = detailRowsFor(data, codeName)

  return (
    <dl className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 sm:contents">
          <dt className="text-xs font-semibold uppercase opacity-60">{label}</dt>
          <dd className="m-0 min-w-0 break-words text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function detailRowsForUrl(url: string, codeName: string) {
  let parsed: URL | null = null
  try {
    parsed = new URL(url)
  } catch {
    parsed = null
  }

  return [
    ['Card name', codeName],
    ['URL', url],
    ['Site', parsed?.hostname.replace(/^www\./, '')],
    ['Path', parsed ? `${parsed.pathname}${parsed.search}` : ''],
    ['Protocol', parsed?.protocol.replace(':', '').toUpperCase()],
  ].filter((row): row is [string, string] => Boolean(row[1]))
}

function UrlDetails({ url, codeName }: { url: string; codeName: string }) {
  const rows = detailRowsForUrl(url, codeName)

  return (
    <dl className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 sm:contents">
          <dt className="text-xs font-semibold uppercase opacity-60">{label}</dt>
          <dd className="m-0 min-w-0 break-words text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function CodeModal({ code, onSave, onDelete, onClose }: CodeModalProps) {
  const [form, setForm] = useState<QrFormState>(() => dataToForm(code.name, code.data))
  const [vcardPanel, setVcardPanel] = useState<'details' | 'fields' | 'raw'>('details')
  const [urlPanel, setUrlPanel] = useState<'details' | 'fields' | 'raw'>('details')
  const { t } = useI18n()
  const close = useCallback(() => onClose(), [onClose])
  useModalHistory(true, close)
  const data = formToQrData(form)
  const barcodeData = code.data.type === QR_DATA_TYPES.barcode ? code.data : null
  const isVCard = data.type === QR_DATA_TYPES.vcard
  const copyText = barcodeData ? barcodeData.text : qrDataAsText(data)
  const displayCodeName = form.name || code.name
  const deleteCode = () => {
    if (!window.confirm(t('default-delete-confirm'))) return
    onDelete()
    onClose()
    history.back()
  }

  return (
    <div className="modal modal-open bg-base-200 px-4 py-6 text-base-content sm:py-10" role="dialog" aria-modal="true" aria-label={code.name}>
      <div className="relative flex max-h-[calc(100dvh-3rem)] w-full max-w-xl flex-col gap-5 overflow-y-auto rounded-3xl bg-base-100 p-6 pt-16 shadow-xl sm:max-h-[calc(100dvh-5rem)] sm:p-10 sm:pt-16 lg:max-w-3xl">
        <button type="button" className="btn btn-ghost btn-sm btn-circle absolute left-4 top-4 z-10" aria-label={t('default-back')} onClick={() => { onClose(); history.back() }}><ArrowLeft /></button>
        {barcodeData ? (
          <>
            <div className="mx-auto flex w-full max-w-2xl items-center justify-center bg-white p-5">
              <BarcodeImage format={barcodeData.format} text={barcodeData.text} fallbackSize={500} className="max-h-[60vh] max-w-full object-contain" alt={code.name || code.text} />
            </div>
            <pre className="mx-auto max-w-sm whitespace-pre-wrap break-words text-left">{formatQrData(barcodeData, t)}</pre>
            <div className="modal-action justify-center md:justify-end">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void navigator.clipboard.writeText(copyText)}><Copy size={16} />{t('default-copy')}</button>
              <button type="button" className="btn btn-error btn-sm" onClick={deleteCode}><Trash2 size={16} />{t('default-delete')}</button>
            </div>
          </>
        ) : (
          <>
            {isVCard ? (
              <>
                <BusinessCardPreview data={data} codeName={displayCodeName} />
                <section className="mx-auto grid w-full max-w-xl gap-4 rounded-lg border border-base-300 bg-base-200 p-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center" aria-label="Scan and actions">
                  <div className="rounded-md border border-base-300 bg-white p-2">
                    <QrIntroFrame text={qrDataAsText(data)} size={500} className="qr-detail-code-frame qr-detail-code-frame-share" label={displayCodeName || code.text} expandable />
                  </div>
                  <div className="min-w-0">
                    <h3 className="m-0 text-base font-semibold">Scan contact</h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => { onSave(formToSavedCode(form)); onClose(); history.back() }}><Check size={16} />{t('default-save')}</button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void navigator.clipboard.writeText(copyText)}><Copy size={16} />{t('default-copy')}</button>
                      <button type="button" className="btn btn-error btn-sm" onClick={deleteCode}><Trash2 size={16} />{t('default-delete')}</button>
                    </div>
                  </div>
                </section>
                <section className="mx-auto w-full max-w-xl">
                  <div role="tablist" className="tabs tabs-box w-full">
                    <button type="button" role="tab" aria-selected={vcardPanel === 'details'} className={`tab flex-1 ${vcardPanel === 'details' ? 'tab-active' : ''}`} onClick={() => setVcardPanel('details')}>Details</button>
                    <button type="button" role="tab" aria-selected={vcardPanel === 'fields'} className={`tab flex-1 ${vcardPanel === 'fields' ? 'tab-active' : ''}`} onClick={() => setVcardPanel('fields')}>Fields</button>
                    <button type="button" role="tab" aria-selected={vcardPanel === 'raw'} className={`tab flex-1 ${vcardPanel === 'raw' ? 'tab-active' : ''}`} onClick={() => setVcardPanel('raw')}>Raw vCard</button>
                  </div>
                  <div className="mt-4 rounded-lg border border-base-300 bg-base-100 p-4">
                    {vcardPanel === 'details' && <VCardDetails data={data} codeName={displayCodeName} />}
                    {vcardPanel === 'fields' && <QrForm form={form} onChange={setForm} showTypeSelect={false} />}
                    {vcardPanel === 'raw' && <pre className="m-0 max-h-80 overflow-auto whitespace-pre-wrap break-words text-left text-xs">{qrDataAsText(data)}</pre>}
                  </div>
                </section>
              </>
            ) : (
              <>
                {data.type === QR_DATA_TYPES.url ? (
                  <>
                    <section className="mx-auto w-full max-w-xl" aria-label={displayCodeName}>
                      <UrlPreview url={data.url} featured />
                    </section>
                    <section className="mx-auto grid w-full max-w-xl gap-4 rounded-lg border border-base-300 bg-base-200 p-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center" aria-label="Scan and actions">
                      <div className="rounded-md border border-base-300 bg-white p-2">
                        <QrIntroFrame text={qrDataAsText(data)} size={500} className="qr-detail-code-frame qr-detail-code-frame-share" label={displayCodeName || code.text} expandable />
                      </div>
                      <div className="min-w-0">
                        <h3 className="m-0 text-base font-semibold">Open link</h3>
                        <p className="m-0 mt-1 break-words text-sm opacity-70">{data.url}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => { onSave(formToSavedCode(form)); onClose(); history.back() }}><Check size={16} />{t('default-save')}</button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void navigator.clipboard.writeText(copyText)}><Copy size={16} />{t('default-copy')}</button>
                          <button type="button" className="btn btn-error btn-sm" onClick={deleteCode}><Trash2 size={16} />{t('default-delete')}</button>
                        </div>
                      </div>
                    </section>
                    <section className="mx-auto w-full max-w-xl">
                      <div role="tablist" className="tabs tabs-box w-full">
                        <button type="button" role="tab" aria-selected={urlPanel === 'details'} className={`tab flex-1 ${urlPanel === 'details' ? 'tab-active' : ''}`} onClick={() => setUrlPanel('details')}>Details</button>
                        <button type="button" role="tab" aria-selected={urlPanel === 'fields'} className={`tab flex-1 ${urlPanel === 'fields' ? 'tab-active' : ''}`} onClick={() => setUrlPanel('fields')}>Fields</button>
                        <button type="button" role="tab" aria-selected={urlPanel === 'raw'} className={`tab flex-1 ${urlPanel === 'raw' ? 'tab-active' : ''}`} onClick={() => setUrlPanel('raw')}>Raw URL</button>
                      </div>
                      <div className="mt-4 rounded-lg border border-base-300 bg-base-100 p-4">
                        {urlPanel === 'details' && <UrlDetails url={data.url} codeName={displayCodeName} />}
                        {urlPanel === 'fields' && <QrForm form={form} onChange={setForm} showTypeSelect={false} />}
                        {urlPanel === 'raw' && <pre className="m-0 max-h-80 overflow-auto whitespace-pre-wrap break-words text-left text-xs">{qrDataAsText(data)}</pre>}
                      </div>
                    </section>
                  </>
                ) : (
                  <>
                    <QrIntroFrame text={qrDataAsText(data)} size={500} className="qr-detail-code-frame" label={code.name || code.text} expandable />
                    <pre className="mx-auto max-w-sm whitespace-pre-wrap break-words text-left">{formatQrData(data, t)}</pre>
                    <div className="mx-auto flex w-full max-w-sm flex-col gap-2"><QrForm form={form} onChange={setForm} showTypeSelect={false} /></div>
                    <FormButtons
                      className="modal-action justify-center md:justify-end"
                      onCopy={() => void navigator.clipboard.writeText(copyText)}
                      onSave={() => { onSave(formToSavedCode(form)); onClose(); history.back() }}
                      onDelete={deleteCode}
                    />
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
