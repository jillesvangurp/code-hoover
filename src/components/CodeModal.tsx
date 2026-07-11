import { useCallback, useState } from 'react'
import { X } from 'lucide-react'
import { dataToForm, formToQrData, formToSavedCode, type QrFormState } from '../domain/form'
import { formatQrData, qrDataAsText, type SavedQrCode } from '../domain/qr'
import { useI18n } from '../i18n/context'
import { useModalHistory } from '../hooks/useModalHistory'
import { FormButtons, QrForm } from './QrForm'
import { QrCodeImage } from './QrCodeImage'

interface CodeModalProps {
  code: SavedQrCode
  onSave: (code: SavedQrCode) => void
  onDelete: () => void
  onClose: () => void
}

export function CodeModal({ code, onSave, onDelete, onClose }: CodeModalProps) {
  const [form, setForm] = useState<QrFormState>(() => dataToForm(code.name, code.data))
  const { t } = useI18n()
  const close = useCallback(() => onClose(), [onClose])
  useModalHistory(true, close)
  const data = formToQrData(form)

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label={code.name}>
      <div className="modal-box relative h-full w-full max-w-full space-y-4 rounded-none p-3 pt-12 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-2xl sm:rounded-box sm:p-6">
        <button type="button" className="btn btn-ghost btn-sm btn-circle absolute right-2 top-2 z-10 sm:right-4 sm:top-4" aria-label={t('default-close')} onClick={() => { onClose(); history.back() }}><X /></button>
        <QrCodeImage text={qrDataAsText(data)} size={800} className="mx-auto aspect-square max-h-[calc(100dvh-12rem)] w-full max-w-lg object-contain" alt={code.name || code.text} />
        <pre className="mx-auto max-w-sm whitespace-pre-wrap break-words text-left">{formatQrData(data, t)}</pre>
        <div className="mx-auto flex w-full max-w-sm flex-col gap-2"><QrForm form={form} onChange={setForm} showTypeSelect={false} /></div>
        <FormButtons
          className="modal-action justify-center md:justify-end"
          onSave={() => { onSave(formToSavedCode(form)); onClose(); history.back() }}
          onDelete={() => { onDelete(); onClose(); history.back() }}
        />
      </div>
    </div>
  )
}
