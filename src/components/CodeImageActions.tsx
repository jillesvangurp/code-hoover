import { useState } from 'react'
import { Download, LoaderCircle, Share2 } from 'lucide-react'
import { useI18n } from '../i18n/context'
import { codeImageFilename, createCodeImageBlob, downloadCodeImage, type CodeImageSource } from '../lib/codeImage'

interface CodeImageActionsProps {
  source: CodeImageSource
  name: string
  className?: string
}

export function CodeImageActions({ source, name, className = '' }: CodeImageActionsProps) {
  const { t } = useI18n()
  const [busyAction, setBusyAction] = useState<'share' | 'download' | null>(null)
  const [error, setError] = useState('')

  const makeImage = async () => {
    const blob = await createCodeImageBlob(source)
    const filename = codeImageFilename(name)
    return { blob, filename, file: new File([blob], filename, { type: blob.type || 'image/png' }) }
  }

  const download = async () => {
    setBusyAction('download')
    setError('')
    try {
      const { blob, filename } = await makeImage()
      downloadCodeImage(blob, filename)
    } catch {
      setError(t('default-image-export-failed'))
    } finally {
      setBusyAction(null)
    }
  }

  const share = async () => {
    setBusyAction('share')
    setError('')
    try {
      const { blob, filename, file } = await makeImage()
      const shareData: ShareData = { files: [file], title: name }
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData)
      } else {
        downloadCodeImage(blob, filename)
      }
    } catch (shareError) {
      if (!(shareError instanceof DOMException && shareError.name === 'AbortError')) {
        setError(t('default-image-export-failed'))
      }
    } finally {
      setBusyAction(null)
    }
  }

  const busy = busyAction !== null
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void share()}>
          {busyAction === 'share' ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
          {t('default-share-image')}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void download()}>
          {busyAction === 'download' ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
          {t('default-download-image')}
        </button>
      </div>
      {error && <p className="m-0 mt-2 text-xs text-error" role="alert">{error}</p>}
    </div>
  )
}
