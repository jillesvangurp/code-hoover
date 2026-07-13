import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Barcode, CalendarDays, Contact, FileText, Grip, Grid2X2, Link, List, Mail, MapPin, MessageSquare, Phone, QrCode, Wifi } from 'lucide-react'
import { emptyQrForm, formToSavedCode, type QrFormState } from '../domain/form'
import { QR_DATA_TYPES, codeFamilyLabel, codePayloadTypeLabel, type QrData, type SavedQrCode } from '../domain/qr'
import { useI18n } from '../i18n/context'
import { BarcodeImage } from '../components/BarcodeImage'
import { CodeModal } from '../components/CodeModal'
import { FormButtons, QrForm } from '../components/QrForm'
import { QrCodeImage } from '../components/QrCodeImage'
import { QrExamplesCarousel } from '../components/QrExamplesCarousel'
import { QrIntroFrame } from '../components/QrIntroFrame'
import { UrlPreview } from '../components/UrlPreview'

const EMPTY_STATE_SAMPLE_URL = 'https://tryformation.com'
type CodesViewMode = 'list' | 'grid'

interface CodesScreenProps {
  codes: SavedQrCode[]
  setCodes: (codes: SavedQrCode[]) => void
  playDelete: () => void
  playOpen?: () => void
  playToggle?: () => void
  playCodeLoad?: (index: number) => void
  showLoadEffect?: boolean
}

interface AddCodeScreenProps {
  codes: SavedQrCode[]
  setCodes: (codes: SavedQrCode[]) => void
  onDone: () => void
  playSave?: () => void
}

function codeTypeIcon(data: QrData) {
  switch (data.type) {
    case QR_DATA_TYPES.url:
      return Link
    case QR_DATA_TYPES.text:
      return FileText
    case QR_DATA_TYPES.wifi:
      return Wifi
    case QR_DATA_TYPES.email:
      return Mail
    case QR_DATA_TYPES.phone:
      return Phone
    case QR_DATA_TYPES.sms:
      return MessageSquare
    case QR_DATA_TYPES.location:
      return MapPin
    case QR_DATA_TYPES.event:
      return CalendarDays
    case QR_DATA_TYPES.vcard:
      return Contact
    case QR_DATA_TYPES.barcode:
      return Barcode
  }
}

function CodeTypeBadge({ data }: { data: QrData }) {
  const TypeIcon = codeTypeIcon(data)
  const FamilyIcon = data.type === QR_DATA_TYPES.barcode ? Barcode : QrCode
  const label = codePayloadTypeLabel(data)

  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-base-300 bg-base-100 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-base-content shadow-sm">
      <TypeIcon size={15} className="shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
      <FamilyIcon size={14} className="shrink-0 opacity-60" aria-hidden="true" />
    </span>
  )
}

function codePreviewLines(code: SavedQrCode): string[] {
  switch (code.data.type) {
    case QR_DATA_TYPES.url:
      return [code.data.url]
    case QR_DATA_TYPES.text:
      return [code.data.text]
    case QR_DATA_TYPES.wifi:
      return [
        code.data.ssid || 'Unnamed network',
        code.data.encryption ? `${code.data.encryption} security` : '',
      ].filter(Boolean)
    case QR_DATA_TYPES.email:
      return [code.data.email, code.data.subject].filter(Boolean)
    case QR_DATA_TYPES.phone:
      return [code.data.phone]
    case QR_DATA_TYPES.sms:
      return [code.data.phone, code.data.message].filter(Boolean)
    case QR_DATA_TYPES.location:
      return [
        code.data.query || code.data.label,
        [code.data.latitude, code.data.longitude].filter(Boolean).join(', '),
      ].filter(Boolean)
    case QR_DATA_TYPES.event:
      return [code.data.start, code.data.location, code.data.description].filter(Boolean)
    case QR_DATA_TYPES.vcard:
      return [
        [code.data.title, code.data.organization].filter(Boolean).join(' · '),
        code.data.email,
        code.data.phone,
      ].filter(Boolean)
    case QR_DATA_TYPES.barcode:
      return [code.data.text]
  }
}

function formatCreatedAt(createdAt: string | undefined, locale: string): string {
  if (!createdAt) return ''
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function CodeThumbnail({ data, text, label }: { data: QrData; text: string; label: string }) {
  return data.type === QR_DATA_TYPES.barcode ? (
    <span className="flex h-16 w-20 items-center justify-center overflow-hidden bg-white p-1">
      <BarcodeImage format={data.format} text={data.text} fallbackSize={160} className="max-h-full max-w-full object-contain" alt={label} loading="lazy" />
    </span>
  ) : (
    <span className="qr-intro-code-frame" style={{ width: '5rem', height: '5rem' }}>
      <span className="qr-intro-finder qr-intro-finder-top-left" aria-hidden="true" />
      <span className="qr-intro-finder qr-intro-finder-top-right" aria-hidden="true" />
      <span className="qr-intro-finder qr-intro-finder-bottom-left" aria-hidden="true" />
      <QrCodeImage text={text} size={160} className="qr-intro-code pointer-events-none h-full w-full" alt={label} loading="lazy" />
    </span>
  )
}

function SortableCode({ id, code, viewMode, onClick }: { id: string; code: SavedQrCode; viewMode: CodesViewMode; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const { locale, t } = useI18n()
  const displayName = code.name || code.text
  const previewLines = codePreviewLines(code)
  const createdAt = formatCreatedAt(code.createdAt, locale)
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    '--qr-card-index': id,
  } as CSSProperties

  const isGrid = viewMode === 'grid'

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`qr-intro-card card w-full cursor-pointer overflow-hidden rounded-2xl bg-base-200 p-4 text-left transition-colors hover:bg-base-300 ${isGrid ? 'grid min-h-72 grid-rows-[auto_1fr_auto] gap-3' : 'grid grid-cols-[1.75rem_minmax(0,1fr)_5rem] items-center gap-3'}`}
      onClick={onClick}
    >
      <button
        type="button"
        className={`btn btn-ghost btn-xs btn-circle cursor-grab touch-none self-start ${isGrid ? 'justify-self-start' : ''}`}
        aria-label={t('default-drag-to-reorder')}
        onClick={(event) => event.stopPropagation()}
        {...attributes}
        {...listeners}
      ><Grip size={16} /></button>
      <div className={`min-w-0 ${isGrid ? 'order-3' : ''}`}>
        <div className="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <CodeTypeBadge data={code.data} />
          <span className="inline-flex items-center rounded-md border border-transparent px-1.5 py-1 text-xs font-semibold uppercase tracking-wide opacity-60">{codeFamilyLabel(code.data)}</span>
        </div>
        <p className="m-0 truncate text-lg font-semibold leading-tight">{displayName}</p>
        {createdAt && <p className="m-0 mt-1 truncate text-xs opacity-60">{t('default-created')}: {createdAt}</p>}
        {code.data.type === QR_DATA_TYPES.url ? (
          <UrlPreview url={code.data.url} compact />
        ) : previewLines.length > 0 && (
          <div className="mt-2 space-y-1">
            {previewLines.slice(0, 3).map((line) => (
              <p key={line} className="m-0 truncate text-sm opacity-75">{line}</p>
            ))}
          </div>
        )}
      </div>
      <div className={isGrid ? 'order-2 flex min-h-28 items-center justify-center' : ''}>
        <CodeThumbnail data={code.data} text={code.text} label={displayName} />
      </div>
    </li>
  )
}

function CodesViewToggle({ viewMode, setViewMode }: { viewMode: CodesViewMode; setViewMode: (viewMode: CodesViewMode) => void }) {
  const changeViewMode = (nextViewMode: CodesViewMode) => {
    if (viewMode === nextViewMode) return
    setViewMode(nextViewMode)
  }

  return (
    <div className="flex w-full justify-center" aria-label="Code view controls">
      <div className="join">
        <button
          type="button"
          className={`btn btn-sm join-item ${viewMode === 'list' ? 'btn-neutral' : 'btn-ghost'}`}
          aria-pressed={viewMode === 'list'}
          onClick={() => changeViewMode('list')}
        >
          <List size={16} aria-hidden="true" />
          List
        </button>
        <button
          type="button"
          className={`btn btn-sm join-item ${viewMode === 'grid' ? 'btn-neutral' : 'btn-ghost'}`}
          aria-pressed={viewMode === 'grid'}
          onClick={() => changeViewMode('grid')}
        >
          <Grid2X2 size={16} aria-hidden="true" />
          Grid
        </button>
      </div>
    </div>
  )
}

function EmptyCodesState() {
  const { t } = useI18n()
  return (
    <section className="flex min-h-80 w-full flex-col items-center justify-center gap-5 rounded-2xl bg-base-200 px-5 py-8 text-center">
      <QrIntroFrame text={EMPTY_STATE_SAMPLE_URL} size={260} className="qr-detail-code-frame max-w-56" label={EMPTY_STATE_SAMPLE_URL} />
      <div className="max-w-sm">
        <h2 className="m-0 text-xl font-semibold">{t('default-empty-codes-title')}</h2>
        <p className="m-0 mt-2 text-sm opacity-75">{t('default-empty-codes-body')}</p>
      </div>
      <a className="link link-primary text-sm" href={EMPTY_STATE_SAMPLE_URL} target="_blank" rel="noopener noreferrer">{EMPTY_STATE_SAMPLE_URL}</a>
    </section>
  )
}

export function AddCodeScreen({ codes, setCodes, onDone, playSave }: AddCodeScreenProps) {
  const [form, setForm] = useState<QrFormState>(emptyQrForm)

  return (
    <div className="flex w-full flex-col gap-4">
      <QrExamplesCarousel onTry={setForm} />
      <QrForm form={form} onChange={setForm} />
      <FormButtons
        className="justify-center md:justify-start"
        onSave={() => { setCodes([...codes, formToSavedCode(form)]); playSave?.(); onDone() }}
        onCancel={onDone}
      />
    </div>
  )
}

export function CodesScreen({ codes, setCodes, playDelete, playOpen, playToggle, playCodeLoad, showLoadEffect = false }: CodesScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<CodesViewMode>('list')
  const codeLoadKey = useMemo(() => codes.map((code) => `${code.text}:${code.createdAt ?? ''}`).join('|'), [codes])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const closeCodeModal = useCallback(() => setSelectedIndex(null), [])
  useEffect(() => {
    if (!playCodeLoad || showLoadEffect || !codes.length) return
    const timers = codes.map((_, index) => window.setTimeout(() => playCodeLoad(index), index * 42))
    return () => timers.forEach(window.clearTimeout)
  }, [codeLoadKey, codes, playCodeLoad, showLoadEffect])

  const onDragEnd = ({ active, over }: DragEndEvent) => {
  if (!over || active.id === over.id) return
    setCodes(arrayMove(codes, Number(active.id), Number(over.id)))
  }

  return (
    <>
      <CodesViewToggle viewMode={viewMode} setViewMode={(nextViewMode) => { playToggle?.(); setViewMode(nextViewMode) }} />
      {showLoadEffect ? (
        <section className="flex min-h-80 w-full items-center justify-center px-5 py-8" aria-label="Loading codes">
          <div className="loading-splash-bar" role="progressbar" aria-label="Loading codes" />
        </section>
      ) : codes.length === 0 ? (
        <EmptyCodesState />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={codes.map((_, index) => String(index))} strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
            <ul className={viewMode === 'grid' ? 'grid w-full grid-cols-1 gap-4 sm:grid-cols-2' : 'flex w-full flex-col gap-4'}>
              {codes.map((code, index) => <SortableCode key={`${code.text}-${index}`} id={String(index)} code={code} viewMode={viewMode} onClick={() => { playOpen?.(); setSelectedIndex(index) }} />)}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {selectedIndex !== null && codes[selectedIndex] && (
        <CodeModal
          code={codes[selectedIndex]}
          onClose={closeCodeModal}
          onSave={(code) => setCodes(codes.map((current, index) => index === selectedIndex ? code : current))}
          onDelete={() => { setCodes(codes.filter((_, index) => index !== selectedIndex)); playDelete() }}
        />
      )}
    </>
  )
}
