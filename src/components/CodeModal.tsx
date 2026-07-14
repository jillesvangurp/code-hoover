import { useCallback, useState } from 'react'
import { ArrowLeft, Barcode, Building2, CalendarDays, Check, Clock, Copy, ExternalLink, FileText, Globe, Info, Mail, MapPin, MessageSquare, Navigation, Phone, Send, Trash2, UserRound, Wifi } from 'lucide-react'
import { dataToForm, formToQrData, formToSavedCode, type QrFormState } from '../domain/form'
import { enrichCode } from '../domain/codeEnrichment'
import { compactEventDate, formatEventRange } from '../domain/eventDate'
import { QR_DATA_TYPES, formatQrData, qrDataAsText, type LocationData, type QrData, type SavedQrCode, type VCardData } from '../domain/qr'
import { useI18n } from '../i18n/context'
import { localizedCodeFamilyLabel, localizedCodePayloadTypeLabel } from '../i18n/labels'
import { useModalHistory } from '../hooks/useModalHistory'
import { BarcodeIntroFrame } from './BarcodeIntroFrame'
import { CodeImageActions } from './CodeImageActions'
import { QrForm } from './QrForm'
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

function formatCreatedAt(createdAt: string | undefined, locale: string): string {
  if (!createdAt) return ''
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

type Translate = ReturnType<typeof useI18n>['t']

function metadataRowsFor(data: QrData, codeName: string, createdAt: string, t: Translate) {
  return [
    [t('default-card-name'), codeName],
    [t('default-code-family'), localizedCodeFamilyLabel(data, t)],
    [t('default-code-type'), localizedCodePayloadTypeLabel(data, t)],
    [t('default-created'), createdAt],
  ].filter((row): row is [string, string] => Boolean(row[1]))
}

function DetailList({ rows }: { rows: Array<[string, string]> }) {
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

function CodeEnrichmentPanel({ data, codeName }: { data: QrData; codeName: string }) {
  const { locale, t } = useI18n()
  const enrichment = enrichCode(data, codeName)
  if (!enrichment) return null
  const summary = locale === 'en-US' ? enrichment.summary : formatQrData(data, t)
  const facts = locale === 'en-US' ? enrichment.facts : []

  return (
    <aside className="mx-auto w-full max-w-xl rounded-lg border border-base-300 bg-base-200 p-4" aria-label={t('default-about-this-code')}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral text-neutral-content">
          <Info size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide opacity-60">{t('default-about-this-code')}</p>
          <p className="m-0 mt-1 break-words text-sm font-medium leading-relaxed">{summary}</p>
          {facts.length > 0 && (
            <dl className="m-0 mt-3 grid gap-2 sm:grid-cols-2">
              {facts.map(({ label, value }) => (
                <div key={label} className="min-w-0 rounded-md bg-base-100 px-3 py-2">
                  <dt className="text-[0.6875rem] font-semibold uppercase opacity-60">{label}</dt>
                  <dd className="m-0 mt-0.5 break-words text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="m-0 mt-3 text-xs opacity-50">{t('default-derived-code-information')}</p>
        </div>
      </div>
    </aside>
  )
}

function detailRowsFor(data: VCardData, codeName: string, createdAt: string, t: Translate) {
  const address = [data.street, data.city, data.region, data.postalCode, data.country].filter(Boolean).join(', ')
  return [
    ...metadataRowsFor(data, codeName, createdAt, t),
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

function VCardDetails({ data, codeName, createdAt }: { data: VCardData; codeName: string; createdAt: string }) {
  const { t } = useI18n()
  const rows = detailRowsFor(data, codeName, createdAt, t)
  return <DetailList rows={rows} />
}

function detailRowsForUrl(data: QrData, url: string, codeName: string, createdAt: string, t: Translate) {
  let parsed: URL | null = null
  try {
    parsed = new URL(/^[a-z][a-z\d+.-]*:/i.test(url.trim()) ? url : `https://${url.trim()}`)
  } catch {
    parsed = null
  }

  return [
    ...metadataRowsFor(data, codeName, createdAt, t),
    ['URL', url],
    ['Site', parsed?.hostname.replace(/^www\./, '')],
    ['Path', parsed ? `${parsed.pathname}${parsed.search}` : ''],
    ['Protocol', parsed?.protocol.replace(':', '').toUpperCase()],
  ].filter((row): row is [string, string] => Boolean(row[1]))
}

function UrlDetails({ data, url, codeName, createdAt }: { data: QrData; url: string; codeName: string; createdAt: string }) {
  const { t } = useI18n()
  const rows = detailRowsForUrl(data, url, codeName, createdAt, t)
  return <DetailList rows={rows} />
}

function mapHref(data: LocationData): string {
  return qrDataAsText(data)
}

function eventDataUrl(data: QrData): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(qrDataAsText(data))}`
}

function PayloadPreview({ data, codeName, createdAt }: { data: QrData; codeName: string; createdAt: string }) {
  const { locale, t } = useI18n()
  const previewBase = "mx-auto w-full max-w-xl shrink-0 overflow-hidden rounded-lg border border-base-300 bg-base-100 text-base-content shadow-xl"

  if (data.type === QR_DATA_TYPES.email) {
    const emailHref = qrDataAsText(data)
    return (
      <section className={previewBase} aria-label={codeName}>
        <div className="border-b border-base-300 bg-base-200 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold"><Mail size={18} aria-hidden="true" />{t('default-new-message')}</span>
            <a className="btn btn-neutral btn-xs shrink-0" href={emailHref}><Send size={13} aria-hidden="true" />{t('default-compose')}</a>
          </div>
        </div>
        <div className="space-y-3 p-5">
          <div className="grid gap-2 text-sm">
            <p className="m-0 min-w-0 border-b border-base-300 pb-2"><span className="font-semibold opacity-60">To</span> <span className="break-words">{data.email || 'recipient@example.com'}</span></p>
            <p className="m-0 min-w-0 border-b border-base-300 pb-2"><span className="font-semibold opacity-60">Subject</span> <span className="break-words font-semibold">{data.subject || codeName}</span></p>
          </div>
          <div className="min-h-28 rounded-md bg-base-200 p-4">
            <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed">{data.body || 'Email body'}</p>
          </div>
          {createdAt && <p className="m-0 text-xs opacity-60">{createdAt}</p>}
        </div>
      </section>
    )
  }

  if (data.type === QR_DATA_TYPES.phone) {
    return (
      <section className={previewBase} aria-label={codeName}>
        <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-center">
          <div className="min-w-0">
            <p className="m-0 text-xs font-semibold uppercase opacity-60">Phone call</p>
            <h2 className="m-0 mt-1 break-words font-mono text-3xl font-bold">{data.phone || codeName}</h2>
            <a className="btn btn-neutral btn-sm mt-4" href={qrDataAsText(data)}><Phone size={16} aria-hidden="true" />Call</a>
            {createdAt && <p className="m-0 mt-3 text-xs opacity-60">{createdAt}</p>}
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center text-xs font-semibold opacity-70">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((key) => (
              <span key={key} className="flex aspect-square items-center justify-center rounded-full border border-base-300 bg-base-200">{key}</span>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (data.type === QR_DATA_TYPES.sms) {
    return (
      <section className={previewBase} aria-label={codeName}>
        <div className="flex items-center justify-between gap-3 border-b border-base-300 bg-base-200 p-4">
          <p className="m-0 flex min-w-0 items-center gap-2 text-sm font-semibold"><MessageSquare size={18} aria-hidden="true" /><span className="truncate">{data.phone || codeName}</span></p>
          <a className="btn btn-neutral btn-xs shrink-0" href={qrDataAsText(data)}><Send size={13} aria-hidden="true" />Open</a>
        </div>
        <div className="min-h-44 space-y-3 bg-base-200 p-5">
          <div className="max-w-[82%] rounded-2xl rounded-bl-md bg-base-100 px-4 py-3 text-base-content shadow-sm">
            <p className="m-0 text-xs opacity-60">To: {data.phone || 'phone number'}</p>
          </div>
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-neutral px-4 py-3 text-neutral-content">
            <p className="m-0 whitespace-pre-wrap break-words text-sm">{data.message || 'SMS message'}</p>
          </div>
          {createdAt && <p className="m-0 mt-3 text-xs opacity-60">{createdAt}</p>}
        </div>
      </section>
    )
  }

  if (data.type === QR_DATA_TYPES.location) {
    const coordinates = [data.latitude, data.longitude].filter(Boolean).join(', ')
    const place = data.query || data.label || coordinates || codeName
    return (
      <section className={previewBase} aria-label={codeName}>
        <a className="block text-base-content no-underline hover:text-base-content" href={mapHref(data)} target="_blank" rel="noopener noreferrer">
          <div className="relative flex min-h-52 items-center justify-center overflow-hidden bg-base-200">
            <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(var(--color-base-300) 1px, transparent 1px), linear-gradient(90deg, var(--color-base-300) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <div className="absolute left-[18%] top-0 h-full w-8 rotate-12 bg-base-100/70" />
            <div className="absolute right-[18%] top-0 h-full w-8 -rotate-12 bg-base-100/70" />
            <div className="absolute left-0 top-[36%] h-8 w-full -rotate-6 bg-base-100/70" />
            <div className="absolute bottom-3 right-3 rounded-md border border-base-300 bg-base-100 px-2 py-1 text-xs font-semibold shadow-sm">Google Maps</div>
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-neutral text-neutral-content shadow-xl">
              <MapPin size={34} aria-hidden="true" />
            </div>
          </div>
          <div className="p-5">
            <p className="m-0 text-xs font-semibold uppercase opacity-60">Maps</p>
            <h2 className="m-0 mt-1 break-words text-2xl font-bold">{data.label || place}</h2>
            {data.query && <p className="m-0 mt-2 break-words text-sm opacity-75">{data.query}</p>}
            {coordinates && <p className="m-0 mt-2 font-mono text-xs opacity-60">{coordinates}</p>}
            <span className="btn btn-neutral btn-sm mt-4"><Navigation size={16} aria-hidden="true" />Open map<ExternalLink size={13} aria-hidden="true" /></span>
          </div>
        </a>
      </section>
    )
  }

  if (data.type === QR_DATA_TYPES.event) {
    const eventDate = compactEventDate(data.start, locale)
    return (
      <section className={previewBase} aria-label={codeName}>
        <div className="grid min-h-56 grid-cols-[5.5rem_minmax(0,1fr)] items-stretch">
          <div className="flex flex-col items-center justify-center bg-neutral text-neutral-content">
            <span className="text-xs font-bold uppercase opacity-80">{eventDate.month}</span>
            <span className="text-3xl font-black leading-none">{eventDate.day}</span>
            <CalendarDays className="mt-3" size={24} aria-hidden="true" />
          </div>
          <div className="min-w-0 p-5">
            <h2 className="m-0 break-words text-2xl font-bold">{data.title || codeName}</h2>
            {data.start && <p className="m-0 mt-3 flex min-w-0 items-center gap-2 text-sm font-semibold"><Clock className="shrink-0" size={15} aria-hidden="true" /><span className="min-w-0 break-words">{formatEventRange(data.start, data.end, locale)}</span></p>}
            {data.location && <p className="m-0 mt-2 flex items-center gap-2 text-sm opacity-75"><MapPin size={15} aria-hidden="true" />{data.location}</p>}
            {data.description && <p className="m-0 mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm opacity-75">{data.description}</p>}
            <a className="btn btn-neutral btn-sm mt-4" href={eventDataUrl(data)} download={`${(data.title || codeName || 'event').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'event'}.ics`}><CalendarDays size={16} aria-hidden="true" />{t('default-add-event')}</a>
          </div>
        </div>
      </section>
    )
  }

  if (data.type === QR_DATA_TYPES.wifi) {
    return (
      <section className={previewBase} aria-label={codeName}>
        <div className="flex min-h-36 items-center gap-4 p-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-neutral text-neutral-content"><Wifi size={28} aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="m-0 text-xs font-semibold uppercase opacity-60">Wi-Fi</p>
            <h2 className="m-0 break-words text-2xl font-bold">{data.ssid || codeName}</h2>
            <p className="m-0 mt-2 text-sm opacity-70">{data.encryption || 'WPA'}</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={previewBase} aria-label={codeName}>
      <div className="flex min-h-36 items-center gap-4 p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-neutral text-neutral-content"><FileText size={28} aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className="m-0 text-xs font-semibold uppercase opacity-60">{localizedCodePayloadTypeLabel(data, t)}</p>
          <h2 className="m-0 break-words text-xl font-bold">{codeName}</h2>
          {'text' in data && <p className="m-0 mt-2 line-clamp-3 break-words text-sm opacity-70">{data.text}</p>}
        </div>
      </div>
    </section>
  )
}

function detailRowsForPayload(data: QrData, codeName: string, createdAt: string, t: Translate) {
  const rows: Array<[string, string]> = metadataRowsFor(data, codeName, createdAt, t)
  switch (data.type) {
    case QR_DATA_TYPES.email:
      rows.push([t('default-email'), data.email], [t('default-subject'), data.subject], [t('default-body'), data.body])
      break
    case QR_DATA_TYPES.phone:
      rows.push([t('default-phone'), data.phone])
      break
    case QR_DATA_TYPES.sms:
      rows.push([t('default-phone'), data.phone], [t('default-message'), data.message])
      break
    case QR_DATA_TYPES.location:
      rows.push([t('default-label'), data.label], [t('default-map-query'), data.query], [t('default-coordinates'), [data.latitude, data.longitude].filter(Boolean).join(', ')])
      break
    case QR_DATA_TYPES.event:
      rows.push([t('default-event-title'), data.title], [t('default-start'), data.start], [t('default-end'), data.end], [t('default-location'), data.location], [t('default-description'), data.description])
      break
    case QR_DATA_TYPES.wifi:
      rows.push([t('default-ssid'), data.ssid], [t('default-password'), data.password], [t('default-encryption'), data.encryption], [t('default-hidden-network'), data.hidden ? t('default-yes') : t('default-no')])
      break
    case QR_DATA_TYPES.text:
      rows.push([t('default-text'), data.text])
      break
    case QR_DATA_TYPES.sepa:
      rows.push([t('default-recipient'), data.recipient], [t('default-iban'), data.iban], [t('default-bic'), data.bic], [t('default-amount'), data.amount ? `EUR ${data.amount}` : ''], [t('default-purpose'), data.purpose], [t('default-reference'), data.reference], [t('default-information'), data.information])
      break
    case QR_DATA_TYPES.whatsapp:
      rows.push([t('default-phone'), data.phone], [t('default-message'), data.message])
      break
    case QR_DATA_TYPES.deepLink:
      rows.push([t('default-label'), data.label], [t('default-url'), data.url])
      break
    case QR_DATA_TYPES.otp:
      rows.push([t('default-code-type'), data.otpType.toUpperCase()], [t('default-issuer'), data.issuer], [t('default-account'), data.account], [t('default-secret'), t('default-hidden')], [t('default-algorithm'), data.algorithm], [t('default-digits'), data.digits], [data.otpType === 'hotp' ? t('default-counter') : t('default-period'), data.otpType === 'hotp' ? data.counter : t('default-seconds-value', { value: data.period })])
      break
    case QR_DATA_TYPES.payment:
      rows.push([t('default-provider'), data.provider], [t('default-target'), data.target], [t('default-amount'), data.amount], [t('default-currency'), data.currency], [t('default-note'), data.note])
      break
    default:
      rows.push([t('default-payload'), qrDataAsText(data)])
  }
  return rows.filter((row): row is [string, string] => Boolean(row[1]))
}

function PayloadDetails({ data, codeName, createdAt }: { data: QrData; codeName: string; createdAt: string }) {
  const { t } = useI18n()
  return <DetailList rows={detailRowsForPayload(data, codeName, createdAt, t)} />
}

function PayloadSections({
  data,
  form,
  setForm,
  codeName,
  codeText,
  createdAt,
  panel,
  setPanel,
  onCopy,
  onSave,
  onDelete,
}: {
  data: QrData
  form: QrFormState
  setForm: (form: QrFormState) => void
  codeName: string
  codeText: string
  createdAt: string
  panel: 'details' | 'fields' | 'raw'
  setPanel: (panel: 'details' | 'fields' | 'raw') => void
  onCopy: () => void
  onSave: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()
  return (
    <>
      <PayloadPreview data={data} codeName={codeName} createdAt={createdAt} />
      <CodeEnrichmentPanel data={data} codeName={codeName} />
      <section className="mx-auto grid w-full max-w-xl gap-4 rounded-lg border border-base-300 bg-base-200 p-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center" aria-label={t('default-scan-and-actions')}>
        <div className="rounded-md border border-base-300 bg-white p-2">
          <QrIntroFrame text={qrDataAsText(data)} size={500} className="qr-detail-code-frame qr-detail-code-frame-share" label={codeName || codeText} expandable />
        </div>
        <div className="min-w-0">
          <h3 className="m-0 text-base font-semibold">{t('default-code-label', { type: localizedCodePayloadTypeLabel(data, t) })}</h3>
          <p className="m-0 mt-1 break-words text-sm opacity-70">{formatQrData(data, t)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={onSave}><Check size={16} />{t('default-save')}</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCopy}><Copy size={16} />{t('default-copy')}</button>
            <button type="button" className="btn btn-error btn-sm" onClick={onDelete}><Trash2 size={16} />{t('default-delete')}</button>
          </div>
          <CodeImageActions className="mt-2" source={{ kind: 'qr', text: qrDataAsText(data) }} name={codeName || codeText} />
        </div>
      </section>
      <section className="mx-auto w-full max-w-xl">
        <div role="tablist" className="tabs tabs-box w-full">
          <button type="button" role="tab" aria-selected={panel === 'details'} className={`tab flex-1 ${panel === 'details' ? 'tab-active' : ''}`} onClick={() => setPanel('details')}>{t('default-details')}</button>
          <button type="button" role="tab" aria-selected={panel === 'fields'} className={`tab flex-1 ${panel === 'fields' ? 'tab-active' : ''}`} onClick={() => setPanel('fields')}>{t('default-fields')}</button>
          <button type="button" role="tab" aria-selected={panel === 'raw'} className={`tab flex-1 ${panel === 'raw' ? 'tab-active' : ''}`} onClick={() => setPanel('raw')}>{t('default-raw')}</button>
        </div>
        <div className="mt-4 rounded-lg border border-base-300 bg-base-100 p-4">
          {panel === 'details' && <PayloadDetails data={data} codeName={codeName} createdAt={createdAt} />}
          {panel === 'fields' && <QrForm form={form} onChange={setForm} showTypeSelect={false} />}
          {panel === 'raw' && <pre className="m-0 max-h-80 overflow-auto whitespace-pre-wrap break-words text-left text-xs">{qrDataAsText(data)}</pre>}
        </div>
      </section>
    </>
  )
}

function BarcodePreview({ data, codeName, createdAt }: { data: QrData & { type: typeof QR_DATA_TYPES.barcode }; codeName: string; createdAt: string }) {
  return (
    <section className="mx-auto w-full max-w-xl" aria-label={codeName}>
      <div className="flex min-h-32 min-w-0 items-center gap-4 rounded-lg border border-base-300 bg-base-100 p-5 text-base-content shadow-xl">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-base-300 bg-white text-black">
          <Barcode size={30} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-xl font-semibold">{codeName}</span>
          <span className="block truncate text-sm opacity-70">{data.format || 'Barcode'}</span>
          {createdAt && <span className="mt-2 block text-xs font-medium opacity-60">{createdAt}</span>}
        </span>
      </div>
    </section>
  )
}

function detailRowsForBarcode(data: QrData & { type: typeof QR_DATA_TYPES.barcode }, codeName: string, createdAt: string, t: Translate) {
  return [
    ...metadataRowsFor(data, codeName, createdAt, t),
    [t('default-format'), data.format],
    [t('default-value'), data.text],
  ].filter((row): row is [string, string] => Boolean(row[1]))
}

function BarcodeDetails({ data, codeName, createdAt }: { data: QrData & { type: typeof QR_DATA_TYPES.barcode }; codeName: string; createdAt: string }) {
  const { t } = useI18n()
  return <DetailList rows={detailRowsForBarcode(data, codeName, createdAt, t)} />
}

function BarcodeSections({
  data,
  codeName,
  createdAt,
  panel,
  setPanel,
  onCopy,
  onDelete,
}: {
  data: QrData & { type: typeof QR_DATA_TYPES.barcode }
  codeName: string
  createdAt: string
  panel: 'details' | 'raw'
  setPanel: (panel: 'details' | 'raw') => void
  onCopy: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()

  return (
    <>
      <BarcodePreview data={data} codeName={codeName} createdAt={createdAt} />
      <CodeEnrichmentPanel data={data} codeName={codeName} />
      <section className="mx-auto grid w-full max-w-xl gap-4 rounded-lg border border-base-300 bg-base-200 p-4 sm:grid-cols-[minmax(11rem,1fr)_minmax(0,1fr)] sm:items-center" aria-label={t('default-scan-and-actions')}>
        <div className="flex min-h-36 items-center justify-center rounded-md border border-base-300 bg-white p-3">
          <BarcodeIntroFrame
            format={data.format}
            text={data.text}
            fallbackSize={500}
            className="barcode-detail-frame h-32 w-full"
            imageClassName="max-h-full max-w-full object-contain"
            alt={codeName}
            expandable
          />
        </div>
        <div className="min-w-0">
          <h3 className="m-0 text-base font-semibold">{t('default-scan-barcode')}</h3>
          <p className="m-0 mt-1 break-words font-mono text-sm opacity-70">{data.text}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={onCopy}><Copy size={16} />{t('default-copy')}</button>
            <button type="button" className="btn btn-error btn-sm" onClick={onDelete}><Trash2 size={16} />{t('default-delete')}</button>
          </div>
          <CodeImageActions className="mt-2" source={{ kind: 'barcode', format: data.format, text: data.text }} name={codeName} />
        </div>
      </section>
      <section className="mx-auto w-full max-w-xl">
        <div role="tablist" className="tabs tabs-box w-full">
          <button type="button" role="tab" aria-selected={panel === 'details'} className={`tab flex-1 ${panel === 'details' ? 'tab-active' : ''}`} onClick={() => setPanel('details')}>{t('default-details')}</button>
          <button type="button" role="tab" aria-selected={panel === 'raw'} className={`tab flex-1 ${panel === 'raw' ? 'tab-active' : ''}`} onClick={() => setPanel('raw')}>{t('default-raw-barcode')}</button>
        </div>
        <div className="mt-4 rounded-lg border border-base-300 bg-base-100 p-4">
          {panel === 'details' && <BarcodeDetails data={data} codeName={codeName} createdAt={createdAt} />}
          {panel === 'raw' && <pre className="m-0 max-h-80 overflow-auto whitespace-pre-wrap break-words text-left text-xs">{formatQrData(data, t)}</pre>}
        </div>
      </section>
    </>
  )
}

export function CodeModal({ code, onSave, onDelete, onClose }: CodeModalProps) {
  const [form, setForm] = useState<QrFormState>(() => dataToForm(code.name, code.data))
  const [vcardPanel, setVcardPanel] = useState<'details' | 'fields' | 'raw'>('details')
  const [urlPanel, setUrlPanel] = useState<'details' | 'fields' | 'raw'>('details')
  const [payloadPanel, setPayloadPanel] = useState<'details' | 'fields' | 'raw'>('details')
  const [barcodePanel, setBarcodePanel] = useState<'details' | 'raw'>('details')
  const { locale, t } = useI18n()
  const close = useCallback(() => onClose(), [onClose])
  useModalHistory(true, close)
  const data = formToQrData(form)
  const barcodeData = code.data.type === QR_DATA_TYPES.barcode ? code.data : null
  const isVCard = data.type === QR_DATA_TYPES.vcard
  const copyText = barcodeData ? barcodeData.text : qrDataAsText(data)
  const displayCodeName = form.name || code.name
  const createdAt = formatCreatedAt(code.createdAt, locale)
  const urlPreviewMetadata = [localizedCodeFamilyLabel(data, t), localizedCodePayloadTypeLabel(data, t), createdAt].filter(Boolean)
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
          <BarcodeSections
            data={barcodeData}
            codeName={displayCodeName}
            createdAt={createdAt}
            panel={barcodePanel}
            setPanel={setBarcodePanel}
            onCopy={() => void navigator.clipboard.writeText(copyText)}
            onDelete={deleteCode}
          />
        ) : (
          <>
            {isVCard ? (
              <>
                <BusinessCardPreview data={data} codeName={displayCodeName} />
                <CodeEnrichmentPanel data={data} codeName={displayCodeName} />
                <section className="mx-auto grid w-full max-w-xl gap-4 rounded-lg border border-base-300 bg-base-200 p-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center" aria-label="Scan and actions">
                  <div className="rounded-md border border-base-300 bg-white p-2">
                    <QrIntroFrame text={qrDataAsText(data)} size={500} className="qr-detail-code-frame qr-detail-code-frame-share" label={displayCodeName || code.text} expandable />
                  </div>
                  <div className="min-w-0">
                    <h3 className="m-0 text-base font-semibold">{t('default-scan-contact')}</h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => { onSave(formToSavedCode(form, code.createdAt ?? null, code)); onClose(); history.back() }}><Check size={16} />{t('default-save')}</button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void navigator.clipboard.writeText(copyText)}><Copy size={16} />{t('default-copy')}</button>
                      <button type="button" className="btn btn-error btn-sm" onClick={deleteCode}><Trash2 size={16} />{t('default-delete')}</button>
                    </div>
                    <CodeImageActions className="mt-2" source={{ kind: 'qr', text: qrDataAsText(data) }} name={displayCodeName || code.text} />
                  </div>
                </section>
                <section className="mx-auto w-full max-w-xl">
                  <div role="tablist" className="tabs tabs-box w-full">
                    <button type="button" role="tab" aria-selected={vcardPanel === 'details'} className={`tab flex-1 ${vcardPanel === 'details' ? 'tab-active' : ''}`} onClick={() => setVcardPanel('details')}>{t('default-details')}</button>
                    <button type="button" role="tab" aria-selected={vcardPanel === 'fields'} className={`tab flex-1 ${vcardPanel === 'fields' ? 'tab-active' : ''}`} onClick={() => setVcardPanel('fields')}>{t('default-fields')}</button>
                    <button type="button" role="tab" aria-selected={vcardPanel === 'raw'} className={`tab flex-1 ${vcardPanel === 'raw' ? 'tab-active' : ''}`} onClick={() => setVcardPanel('raw')}>{t('default-raw-vcard')}</button>
                  </div>
                  <div className="mt-4 rounded-lg border border-base-300 bg-base-100 p-4">
                    {vcardPanel === 'details' && <VCardDetails data={data} codeName={displayCodeName} createdAt={createdAt} />}
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
                      <UrlPreview url={data.url} featured metadata={urlPreviewMetadata} />
                    </section>
                    <CodeEnrichmentPanel data={data} codeName={displayCodeName} />
                    <section className="mx-auto grid w-full max-w-xl gap-4 rounded-lg border border-base-300 bg-base-200 p-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center" aria-label="Scan and actions">
                      <div className="rounded-md border border-base-300 bg-white p-2">
                        <QrIntroFrame text={qrDataAsText(data)} size={500} className="qr-detail-code-frame qr-detail-code-frame-share" label={displayCodeName || code.text} expandable />
                      </div>
                      <div className="min-w-0">
                        <h3 className="m-0 text-base font-semibold">{t('default-open-link')}</h3>
                        <p className="m-0 mt-1 break-words text-sm opacity-70">{data.url}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => { onSave(formToSavedCode(form, code.createdAt ?? null, code)); onClose(); history.back() }}><Check size={16} />{t('default-save')}</button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void navigator.clipboard.writeText(copyText)}><Copy size={16} />{t('default-copy')}</button>
                          <button type="button" className="btn btn-error btn-sm" onClick={deleteCode}><Trash2 size={16} />{t('default-delete')}</button>
                        </div>
                        <CodeImageActions className="mt-2" source={{ kind: 'qr', text: qrDataAsText(data) }} name={displayCodeName || code.text} />
                      </div>
                    </section>
                    <section className="mx-auto w-full max-w-xl">
                      <div role="tablist" className="tabs tabs-box w-full">
                        <button type="button" role="tab" aria-selected={urlPanel === 'details'} className={`tab flex-1 ${urlPanel === 'details' ? 'tab-active' : ''}`} onClick={() => setUrlPanel('details')}>{t('default-details')}</button>
                        <button type="button" role="tab" aria-selected={urlPanel === 'fields'} className={`tab flex-1 ${urlPanel === 'fields' ? 'tab-active' : ''}`} onClick={() => setUrlPanel('fields')}>{t('default-fields')}</button>
                        <button type="button" role="tab" aria-selected={urlPanel === 'raw'} className={`tab flex-1 ${urlPanel === 'raw' ? 'tab-active' : ''}`} onClick={() => setUrlPanel('raw')}>{t('default-raw-url')}</button>
                      </div>
                      <div className="mt-4 rounded-lg border border-base-300 bg-base-100 p-4">
                        {urlPanel === 'details' && <UrlDetails data={data} url={data.url} codeName={displayCodeName} createdAt={createdAt} />}
                        {urlPanel === 'fields' && <QrForm form={form} onChange={setForm} showTypeSelect={false} />}
                        {urlPanel === 'raw' && <pre className="m-0 max-h-80 overflow-auto whitespace-pre-wrap break-words text-left text-xs">{qrDataAsText(data)}</pre>}
                      </div>
                    </section>
                  </>
                ) : (
                  <PayloadSections
                    data={data}
                    form={form}
                    setForm={setForm}
                    codeName={displayCodeName}
                    codeText={code.text}
                    createdAt={createdAt}
                    panel={payloadPanel}
                    setPanel={setPayloadPanel}
                    onCopy={() => void navigator.clipboard.writeText(copyText)}
                    onSave={() => { onSave(formToSavedCode(form, code.createdAt ?? null, code)); onClose(); history.back() }}
                    onDelete={deleteCode}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
