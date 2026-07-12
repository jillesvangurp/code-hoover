import { useCallback, useState, type CSSProperties } from 'react'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Barcode, Contact, FileText, Grip, Link, Wifi } from 'lucide-react'
import { emptyQrForm, formToSavedCode, type QrFormState } from '../domain/form'
import { QR_DATA_TYPES, type QrData, type SavedQrCode } from '../domain/qr'
import { useI18n } from '../i18n/context'
import { BarcodeImage } from '../components/BarcodeImage'
import { CodeModal } from '../components/CodeModal'
import { FormButtons, QrForm } from '../components/QrForm'
import { HooverGraphic } from '../components/HooverGraphic'
import { QrCodeImage } from '../components/QrCodeImage'
import { QrIntroFrame } from '../components/QrIntroFrame'
import { UrlPreview } from '../components/UrlPreview'

const EMPTY_STATE_SAMPLE_URL = 'https://tryformation.com'

interface CodesScreenProps {
  codes: SavedQrCode[]
  setCodes: (codes: SavedQrCode[]) => void
  playDelete: () => void
  showLoadEffect?: boolean
}

interface AddCodeScreenProps {
  codes: SavedQrCode[]
  setCodes: (codes: SavedQrCode[]) => void
  onDone: () => void
}

function codeTypeLabel(code: SavedQrCode): string {
  switch (code.data.type) {
    case QR_DATA_TYPES.url:
      return 'URL'
    case QR_DATA_TYPES.text:
      return 'Text'
    case QR_DATA_TYPES.wifi:
      return 'Wi-Fi'
    case QR_DATA_TYPES.vcard:
      return 'vCard'
    case QR_DATA_TYPES.barcode:
      return code.data.format
  }
}

function codeTypeIcon(code: SavedQrCode) {
  switch (code.data.type) {
    case QR_DATA_TYPES.url:
      return Link
    case QR_DATA_TYPES.text:
      return FileText
    case QR_DATA_TYPES.wifi:
      return Wifi
    case QR_DATA_TYPES.vcard:
      return Contact
    case QR_DATA_TYPES.barcode:
      return Barcode
  }
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

function SortableCode({ id, code, onClick }: { id: string; code: SavedQrCode; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const { t } = useI18n()
  const displayName = code.name || code.text
  const previewLines = codePreviewLines(code)
  const TypeIcon = codeTypeIcon(code)
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    '--qr-card-index': id,
  } as CSSProperties

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="qr-intro-card card grid w-full cursor-pointer grid-cols-[1.75rem_minmax(0,1fr)_5rem] items-center gap-3 overflow-hidden rounded-2xl bg-base-200 p-4 text-left transition-colors hover:bg-base-300"
      onClick={onClick}
    >
      <button
        type="button"
        className="btn btn-ghost btn-xs btn-circle cursor-grab touch-none self-start"
        aria-label={t('default-drag-to-reorder')}
        onClick={(event) => event.stopPropagation()}
        {...attributes}
        {...listeners}
      ><Grip size={16} /></button>
      <div className="min-w-0">
        <div className="mb-2 flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-60">
          <TypeIcon size={14} className="shrink-0" aria-hidden="true" />
          <span>{codeTypeLabel(code)}</span>
        </div>
        <p className="m-0 truncate text-lg font-semibold leading-tight">{displayName}</p>
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
      <CodeThumbnail data={code.data} text={code.text} label={displayName} />
    </li>
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

export function AddCodeScreen({ codes, setCodes, onDone }: AddCodeScreenProps) {
  const [form, setForm] = useState<QrFormState>(emptyQrForm)

  return (
    <div className="flex w-full flex-col gap-4">
      <QrForm form={form} onChange={setForm} />
      <FormButtons
        className="justify-center md:justify-start"
        onSave={() => { setCodes([...codes, formToSavedCode(form)]); onDone() }}
        onCancel={onDone}
      />
    </div>
  )
}

export function CodesScreen({ codes, setCodes, playDelete, showLoadEffect = false }: CodesScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const closeCodeModal = useCallback(() => setSelectedIndex(null), [])
  const onDragEnd = ({ active, over }: DragEndEvent) => {
  if (!over || active.id === over.id) return
    setCodes(arrayMove(codes, Number(active.id), Number(over.id)))
  }

  return (
    <>
      {showLoadEffect ? (
        <section className="codes-load-effect flex min-h-80 w-full items-center justify-center rounded-2xl bg-base-200 px-5 py-8" aria-label="Loading codes">
          <HooverGraphic showBar />
        </section>
      ) : codes.length === 0 ? (
        <EmptyCodesState />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={codes.map((_, index) => String(index))} strategy={verticalListSortingStrategy}>
            <ul className="flex w-full flex-col gap-4">
              {codes.map((code, index) => <SortableCode key={`${code.text}-${index}`} id={String(index)} code={code} onClick={() => setSelectedIndex(index)} />)}
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
