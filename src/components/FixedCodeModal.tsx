import { useCallback } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n/context'
import { useModalHistory } from '../hooks/useModalHistory'
import { QrIntroFrame } from './QrIntroFrame'
import { CodeImageActions } from './CodeImageActions'

export function FixedCodeModal({ url, label, onClose }: { url: string; label: string; onClose: () => void }) {
  const { t } = useI18n()
  const close = useCallback(() => onClose(), [onClose])
  useModalHistory(true, close)
  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label={label}>
      <div className="modal-box relative flex h-full w-full max-w-full flex-col items-center justify-center gap-6">
        <button type="button" className="btn btn-ghost btn-sm btn-circle absolute right-4 top-4" aria-label={t('default-close')} onClick={() => { onClose(); history.back() }}><X /></button>
        <QrIntroFrame text={url} size={700} className="qr-detail-code-frame qr-detail-code-frame-large" label={label} quietZone />
        <CodeImageActions source={{ kind: 'qr', text: url }} name={label} />
        <hr className="w-24 border-base-300" />
        <a className="link link-primary text-lg" href={url} target="_blank" rel="noopener noreferrer">{label}</a>
      </div>
    </div>
  )
}
