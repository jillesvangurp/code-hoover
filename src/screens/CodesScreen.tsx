import { useCallback, useState } from 'react'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Grip, Plus, ScanLine } from 'lucide-react'
import { emptyQrForm, formToSavedCode, type QrFormState } from '../domain/form'
import type { SavedQrCode } from '../domain/qr'
import { useI18n } from '../i18n/context'
import { CodeModal } from '../components/CodeModal'
import { FixedCodeModal } from '../components/FixedCodeModal'
import { FormButtons, QrForm } from '../components/QrForm'
import { QrCodeImage } from '../components/QrCodeImage'

export const CODE_HOOVER_REPOSITORY_URL = 'https://github.com/jillesvangurp/code-hoover'
export const CODE_HOOVER_APP_URL = 'https://codehoover.jillesvangurp.com'

interface CodesScreenProps {
  codes: SavedQrCode[]
  setCodes: (codes: SavedQrCode[]) => void
  onScan: () => void
  playDelete: () => void
}

function SortableCode({ id, code, onClick }: { id: string; code: SavedQrCode; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const { t } = useI18n()
  const displayName = code.name || code.text
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="card relative flex w-full cursor-pointer flex-col items-center gap-3 rounded-2xl bg-base-200 p-4 text-center"
      onClick={onClick}
    >
      <button
        type="button"
        className="btn btn-ghost btn-xs btn-circle absolute right-3 top-3 cursor-grab touch-none"
        aria-label={t('default-drag-to-reorder')}
        onClick={(event) => event.stopPropagation()}
        {...attributes}
        {...listeners}
      ><Grip size={16} /></button>
      <QrCodeImage text={code.text} size={160} className="pointer-events-none mx-auto h-24 w-24" alt={displayName} loading="lazy" />
      <p className="m-0 line-clamp-2 min-h-12 w-full break-all font-medium">{displayName}</p>
    </li>
  )
}

function FixedCodeCard({ url, label, onClick }: { url: string; label: string; onClick: () => void }) {
  return (
    <li className="card flex w-full cursor-pointer flex-col items-center gap-3 rounded-2xl bg-base-200 p-4 text-center" onClick={onClick}>
      <QrCodeImage text={url} size={160} className="pointer-events-none mx-auto h-24 w-24" alt={label} />
      <hr className="w-24 border-base-300" />
      <a className="link link-primary" href={url} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>{label}</a>
    </li>
  )
}

export function CodesScreen({ codes, setCodes, onScan, playDelete }: CodesScreenProps) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<QrFormState>(emptyQrForm)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [fixedCode, setFixedCode] = useState<string | null>(null)
  const { t } = useI18n()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const closeCodeModal = useCallback(() => setSelectedIndex(null), [])
  const closeFixedModal = useCallback(() => setFixedCode(null), [])
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    setCodes(arrayMove(codes, Number(active.id), Number(over.id)))
  }

  if (editing) {
    return (
      <div className="flex w-full flex-col gap-4">
        <QrForm form={form} onChange={setForm} />
        <FormButtons
          className="justify-center md:justify-start"
          onSave={() => { setCodes([...codes, formToSavedCode(form)]); setEditing(false) }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  const fixedLabel = fixedCode === CODE_HOOVER_REPOSITORY_URL ? t('default-github-repo') : t('default-open-on-different-device')
  return (
    <>
      <div className="flex w-full flex-wrap justify-center gap-2 md:justify-start">
        <button type="button" className="btn btn-primary" onClick={() => { setForm(emptyQrForm()); setEditing(true) }}><Plus size={18} />{t('default-add')}</button>
        <button type="button" className="btn btn-secondary" onClick={onScan}><ScanLine size={18} />{t('default-scan')}</button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={codes.map((_, index) => String(index))} strategy={rectSortingStrategy}>
          <ul className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
            {codes.map((code, index) => <SortableCode key={`${code.text}-${index}`} id={String(index)} code={code} onClick={() => setSelectedIndex(index)} />)}
          </ul>
        </SortableContext>
      </DndContext>
      <hr className="mt-4 w-24 self-center border-base-300" />
      <ul className="flex w-full flex-col gap-4">
        <FixedCodeCard url={CODE_HOOVER_REPOSITORY_URL} label={t('default-github-repo')} onClick={() => setFixedCode(CODE_HOOVER_REPOSITORY_URL)} />
        <FixedCodeCard url={CODE_HOOVER_APP_URL} label={t('default-open-on-different-device')} onClick={() => setFixedCode(CODE_HOOVER_APP_URL)} />
      </ul>
      {fixedCode && <FixedCodeModal url={fixedCode} label={fixedLabel} onClose={closeFixedModal} />}
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
