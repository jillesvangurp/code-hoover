import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { rectSortingStrategy, sortableKeyboardCoordinates, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDownUp, BadgeEuro, Barcode, CalendarDays, Contact, CreditCard, FileKey2, FileText, GripVertical, Grid2X2, Link, List, Mail, MapPin, MessageCircle, MessageSquare, Phone, QrCode, Search, Smartphone, Wifi } from 'lucide-react'
import { emptyQrForm, formToSavedCode, type QrFormState } from '../domain/form'
import { reorderDisplayedCodes } from '../domain/codeOrder'
import { formatEventRange } from '../domain/eventDate'
import { QR_DATA_TYPES, savedCodeRecordId, type QrData, type SavedQrCode } from '../domain/qr'
import { useI18n } from '../i18n/context'
import { localizedCodeFamilyLabel, localizedCodePayloadTypeLabel } from '../i18n/labels'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { BarcodeIntroFrame } from '../components/BarcodeIntroFrame'
import { CodeModal } from '../components/CodeModal'
import { FormButtons, QrForm } from '../components/QrForm'
import { QrCodeImage } from '../components/QrCodeImage'
import { QrExamplesCarousel } from '../components/QrExamplesCarousel'
import { QrIntroFrame } from '../components/QrIntroFrame'
import { UrlPreview } from '../components/UrlPreview'

const EMPTY_STATE_SAMPLE_URL = 'https://tryformation.com'
type CodesViewMode = 'list' | 'grid'
type CodesSortOrder = 'manual' | 'newest' | 'oldest' | 'type'
const MAX_CODE_LOAD_SOUNDS = 10

function parseCodesSortOrder(value: string): CodesSortOrder {
  try {
    const parsed: unknown = JSON.parse(value)
    if (parsed === 'manual' || parsed === 'newest' || parsed === 'oldest' || parsed === 'type') return parsed
  } catch {
    if (value === 'manual' || value === 'newest' || value === 'oldest' || value === 'type') return value
  }
  return 'newest'
}

interface CodesScreenProps {
  codes: SavedQrCode[]
  setCodes: (codes: SavedQrCode[]) => void
  playDelete: () => void
  playOpen?: () => void
  playToggle?: () => void
  playCodeLoad?: (index: number) => void
  shouldPlayCodeLoadSounds?: boolean
  onCodeLoadSoundsPlayed?: () => void
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
    case QR_DATA_TYPES.sepa:
      return BadgeEuro
    case QR_DATA_TYPES.whatsapp:
      return MessageCircle
    case QR_DATA_TYPES.deepLink:
      return Smartphone
    case QR_DATA_TYPES.otp:
      return FileKey2
    case QR_DATA_TYPES.payment:
      return CreditCard
  }
}

function CodeTypeBadge({ data }: { data: QrData }) {
  const { t } = useI18n()
  const TypeIcon = codeTypeIcon(data)
  const FamilyIcon = data.type === QR_DATA_TYPES.barcode ? Barcode : QrCode
  const label = localizedCodePayloadTypeLabel(data, t)

  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-base-300 bg-base-100 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-base-content shadow-sm">
      <TypeIcon size={15} className="shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
      <FamilyIcon size={14} className="shrink-0 opacity-60" aria-hidden="true" />
    </span>
  )
}

function codePreviewLines(code: SavedQrCode, t: ReturnType<typeof useI18n>['t'], locale: string): string[] {
  switch (code.data.type) {
    case QR_DATA_TYPES.url:
      return [code.data.url]
    case QR_DATA_TYPES.text:
      return [code.data.text]
    case QR_DATA_TYPES.wifi:
      return [
        code.data.ssid || t('default-unnamed-network'),
        code.data.encryption ? t('default-security-value', { value: code.data.encryption }) : '',
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
      return [formatEventRange(code.data.start, code.data.end, locale), code.data.location, code.data.description].filter(Boolean)
    case QR_DATA_TYPES.vcard:
      return [
        [code.data.title, code.data.organization].filter(Boolean).join(' · '),
        code.data.email,
        code.data.phone,
      ].filter(Boolean)
    case QR_DATA_TYPES.barcode:
      return [code.data.text]
    case QR_DATA_TYPES.sepa:
      return [code.data.recipient, code.data.iban, code.data.amount ? `EUR ${code.data.amount}` : ''].filter(Boolean)
    case QR_DATA_TYPES.whatsapp:
      return [code.data.phone, code.data.message].filter(Boolean)
    case QR_DATA_TYPES.deepLink:
      return [code.data.label, code.data.url].filter(Boolean)
    case QR_DATA_TYPES.otp:
      return [[code.data.issuer, code.data.account].filter(Boolean).join(' · '), t('default-local-only-not-synced')].filter(Boolean)
    case QR_DATA_TYPES.payment:
      return [code.data.provider, code.data.target, code.data.amount ? `${code.data.amount} ${code.data.currency}`.trim() : ''].filter(Boolean)
  }
}

function formatCreatedAt(createdAt: string | undefined, locale: string): string {
  if (!createdAt) return ''
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function CodeThumbnail({ data, text, label, compact = false }: { data: QrData; text: string; label: string; compact?: boolean }) {
  return data.type === QR_DATA_TYPES.barcode ? (
    <BarcodeIntroFrame
      format={data.format}
      text={data.text}
      fallbackSize={160}
      className={compact ? 'h-14 w-[4.5rem]' : 'h-16 w-20'}
      imageClassName="max-h-full max-w-full object-contain"
      alt={label}
      loading="lazy"
    />
  ) : (
    <span className="qr-intro-code-frame" style={{ width: compact ? '4.5rem' : '5rem', height: compact ? '4.5rem' : '5rem' }}>
      <span className="qr-intro-finder qr-intro-finder-top-left" aria-hidden="true" />
      <span className="qr-intro-finder qr-intro-finder-top-right" aria-hidden="true" />
      <span className="qr-intro-finder qr-intro-finder-bottom-left" aria-hidden="true" />
      <QrCodeImage text={text} size={160} className="qr-intro-code pointer-events-none h-full w-full" alt={label} loading="lazy" />
    </span>
  )
}

function CodeCard({ code, sortableId, viewMode, onClick, sortable = true }: { code: SavedQrCode; sortableId: string; viewMode: CodesViewMode; onClick: () => void; sortable?: boolean }) {
  const { locale, t } = useI18n()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortableId, disabled: !sortable })
  const displayName = code.name || code.text
  const previewLines = codePreviewLines(code, t, locale)
  const createdAt = formatCreatedAt(code.createdAt, locale)

  const isGrid = viewMode === 'grid'

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`qr-intro-card card w-full cursor-pointer overflow-hidden rounded-2xl bg-base-200 text-left transition-colors hover:bg-base-300 ${isDragging ? 'z-10 opacity-70 shadow-xl' : ''} ${isGrid ? 'grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 p-3' : 'grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-3 p-4'}`}
      onClick={onClick}
    >
      <div className={`min-w-0 ${isGrid ? 'order-2' : ''}`}>
        <div className="mb-2 flex min-w-0 items-start justify-between gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <CodeTypeBadge data={code.data} />
            {!isGrid && <span className="inline-flex items-center rounded-md border border-transparent px-1.5 py-1 text-xs font-semibold uppercase tracking-wide opacity-60">{localizedCodeFamilyLabel(code.data, t)}</span>}
          </div>
          {sortable && (
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square -mr-1 shrink-0 cursor-grab touch-none active:cursor-grabbing"
              aria-label={`${t('default-drag-to-reorder')}: ${displayName}`}
              onClick={(event) => event.stopPropagation()}
              {...attributes}
              {...listeners}
            >
              <GripVertical size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <p className={`m-0 truncate font-semibold leading-tight ${isGrid ? 'text-base' : 'text-lg'}`}>{displayName}</p>
        {createdAt && !isGrid && <p className="m-0 mt-1 truncate text-xs opacity-60">{t('default-created')}: {createdAt}</p>}
        {code.data.type === QR_DATA_TYPES.url ? (
          isGrid ? <p className="m-0 mt-1 truncate text-xs opacity-70">{code.data.url}</p> : <UrlPreview url={code.data.url} compact />
        ) : previewLines.length > 0 && (
          <div className="mt-2 space-y-1">
            {previewLines.slice(0, isGrid ? 1 : 3).map((line) => (
              <p key={line} className="m-0 truncate text-sm opacity-75">{line}</p>
            ))}
          </div>
        )}
      </div>
      <div className={isGrid ? 'order-1 flex items-center justify-center' : ''}>
        <CodeThumbnail data={code.data} text={code.text} label={displayName} compact={isGrid} />
      </div>
    </li>
  )
}

function CodesViewToggle({ viewMode, setViewMode, sortOrder, setSortOrder }: { viewMode: CodesViewMode; setViewMode: (viewMode: CodesViewMode) => void; sortOrder: CodesSortOrder; setSortOrder: (sortOrder: CodesSortOrder) => void }) {
  const { t } = useI18n()
  const changeViewMode = (nextViewMode: CodesViewMode) => {
    if (viewMode === nextViewMode) return
    setViewMode(nextViewMode)
  }

  return (
    <div className="flex w-full items-center justify-between" aria-label={t('default-code-view-controls')}>
      <div className="join">
        <button
          type="button"
          className={`btn btn-sm join-item ${viewMode === 'list' ? 'btn-neutral' : 'btn-ghost'}`}
          aria-pressed={viewMode === 'list'}
          onClick={() => changeViewMode('list')}
        >
          <List size={16} aria-hidden="true" />
          {t('default-list')}
        </button>
        <button
          type="button"
          className={`btn btn-sm join-item ${viewMode === 'grid' ? 'btn-neutral' : 'btn-ghost'}`}
          aria-pressed={viewMode === 'grid'}
          onClick={() => changeViewMode('grid')}
        >
          <Grid2X2 size={16} aria-hidden="true" />
          {t('default-grid')}
        </button>
      </div>
      <label className="flex items-center gap-2">
        <ArrowDownUp size={16} className="shrink-0 opacity-60" aria-hidden="true" />
        <span className="sr-only">{t('default-sort')}</span>
        <select
          className="select select-bordered select-sm w-auto max-w-44"
          value={sortOrder}
          aria-label={t('default-sort')}
          onChange={(event) => setSortOrder(event.target.value as CodesSortOrder)}
        >
          <option value="newest">{t('default-newest-first')}</option>
          <option value="oldest">{t('default-oldest-first')}</option>
          <option value="type">{t('default-type-groups')}</option>
          <option value="manual">{t('default-manual-order')}</option>
        </select>
      </label>
    </div>
  )
}

function codeTypeGroupLabel(code: SavedQrCode, t: ReturnType<typeof useI18n>['t']): string {
  return code.data.type === QR_DATA_TYPES.barcode ? t('default-barcode') : localizedCodePayloadTypeLabel(code.data, t)
}

function searchableCodeText(code: SavedQrCode, t: ReturnType<typeof useI18n>['t'], locale: string): string {
  return [
    code.name,
    code.text,
    codeTypeGroupLabel(code, t),
    localizedCodePayloadTypeLabel(code.data, t),
    ...codePreviewLines(code, t, locale),
  ].join('\n').toLocaleLowerCase(locale)
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

export function CodesScreen({ codes, setCodes, playDelete, playOpen, playToggle, playCodeLoad, shouldPlayCodeLoadSounds = true, onCodeLoadSoundsPlayed, showLoadEffect = false }: CodesScreenProps) {
  const { locale, t } = useI18n()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<CodesViewMode>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useLocalStorage<CodesSortOrder>('codes-sort-order', 'newest', parseCodesSortOrder)
  const didPlayCodeLoadSounds = useRef(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const codeLoadKey = useMemo(() => codes.map((code) => `${savedCodeRecordId(code)}:${code.revision ?? 1}`).join('|'), [codes])
  const displayedCodes = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase(locale)
    return codes.map((code, originalIndex) => ({ code, originalIndex, id: savedCodeRecordId(code) })).filter(({ code }) => (
      !normalizedQuery || searchableCodeText(code, t, locale).includes(normalizedQuery)
    )).sort((left, right) => {
      if (sortOrder === 'manual') return left.originalIndex - right.originalIndex
      if (sortOrder === 'type') {
        const typeOrder = codeTypeGroupLabel(left.code, t).localeCompare(codeTypeGroupLabel(right.code, t), locale, { sensitivity: 'base' })
        if (typeOrder !== 0) return typeOrder
      }
      const leftCreatedAt = left.code.createdAt ? Date.parse(left.code.createdAt) : Number.NaN
      const rightCreatedAt = right.code.createdAt ? Date.parse(right.code.createdAt) : Number.NaN
      const leftOrder = Number.isNaN(leftCreatedAt) ? left.originalIndex : leftCreatedAt
      const rightOrder = Number.isNaN(rightCreatedAt) ? right.originalIndex : rightCreatedAt
      return sortOrder === 'oldest' ? leftOrder - rightOrder : rightOrder - leftOrder
    })
  }, [codes, locale, searchQuery, sortOrder, t])
  const typeGroups = useMemo(() => {
    if (sortOrder !== 'type') return []
    const groups = new Map<string, typeof displayedCodes>()
    for (const record of displayedCodes) {
      const label = codeTypeGroupLabel(record.code, t)
      groups.set(label, [...(groups.get(label) ?? []), record])
    }
    return [...groups.entries()]
  }, [displayedCodes, sortOrder, t])
  const sortable = searchQuery.trim() === '' && sortOrder !== 'type'

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!sortable || !over || active.id === over.id) return
    const reorderedCodes = reorderDisplayedCodes(displayedCodes, active.id, over.id)
    if (!reorderedCodes) return
    setCodes(reorderedCodes)
    setSortOrder('manual')
  }

  const closeCodeModal = useCallback(() => setSelectedIndex(null), [])
  useEffect(() => {
    if (!playCodeLoad || !shouldPlayCodeLoadSounds || didPlayCodeLoadSounds.current || showLoadEffect || !codes.length) return
    const soundCount = Math.min(codes.length, MAX_CODE_LOAD_SOUNDS)
    const timers = Array.from({ length: soundCount }, (_, index) => window.setTimeout(() => {
      if (index === 0) {
        didPlayCodeLoadSounds.current = true
        onCodeLoadSoundsPlayed?.()
      }
      playCodeLoad(index)
    }, index * 42))
    return () => timers.forEach(window.clearTimeout)
  }, [codeLoadKey, codes, onCodeLoadSoundsPlayed, playCodeLoad, shouldPlayCodeLoadSounds, showLoadEffect])

  return (
    <>
      <CodesViewToggle viewMode={viewMode} setViewMode={(nextViewMode) => { playToggle?.(); setViewMode(nextViewMode) }} sortOrder={sortOrder} setSortOrder={setSortOrder} />
      {codes.length > 0 && (
        <label className="input input-bordered input-sm flex w-full items-center gap-2">
          <Search size={16} className="shrink-0 opacity-60" aria-hidden="true" />
          <input
            type="search"
            className="grow"
            value={searchQuery}
            placeholder={t('default-search-codes')}
            aria-label={t('default-search-codes')}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
      )}
      {showLoadEffect ? (
        <section className="flex min-h-80 w-full items-center justify-center px-5 py-8" aria-label={t('default-loading-codes')}>
          <div className="loading-splash-bar" role="progressbar" aria-label={t('default-loading-codes')} />
        </section>
      ) : codes.length === 0 ? (
        <EmptyCodesState />
      ) : displayedCodes.length === 0 ? (
        <p className="m-0 rounded-2xl bg-base-200 px-5 py-12 text-center text-sm opacity-75">{t('default-no-matching-codes')}</p>
      ) : sortOrder === 'type' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayedCodes.map(({ id }) => id)} strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
            <div className="flex w-full flex-col gap-6">
              {typeGroups.map(([label, records]) => (
                <section key={label} className="flex w-full flex-col gap-3" aria-labelledby={`code-type-${records[0].id}`}>
                  <div className="flex items-center gap-2 border-b border-base-300 pb-2">
                    <h2 id={`code-type-${records[0].id}`} className="m-0 text-sm font-bold uppercase tracking-wide">{label}</h2>
                    <span className="badge badge-ghost badge-sm">{records.length}</span>
                  </div>
                  <ul className={viewMode === 'grid' ? 'grid w-full grid-cols-1 gap-4 sm:grid-cols-2' : 'flex w-full flex-col gap-4'}>
                    {records.map(({ code, originalIndex, id }) => <CodeCard key={id} sortableId={id} code={code} viewMode={viewMode} sortable={false} onClick={() => { playOpen?.(); setSelectedIndex(originalIndex) }} />)}
                  </ul>
                </section>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayedCodes.map(({ id }) => id)} strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
            <ul className={viewMode === 'grid' ? 'grid w-full grid-cols-1 gap-4 sm:grid-cols-2' : 'flex w-full flex-col gap-4'}>
              {displayedCodes.map(({ code, originalIndex, id }) => <CodeCard key={id} sortableId={id} code={code} viewMode={viewMode} sortable={sortable} onClick={() => { playOpen?.(); setSelectedIndex(originalIndex) }} />)}
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
