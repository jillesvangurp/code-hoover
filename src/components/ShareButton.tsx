import { Share2 } from 'lucide-react'
import { useI18n } from '../i18n/context'

interface ShareButtonProps {
  title: string
  text?: string
  url?: string
  className?: string
  showLabel?: boolean
}

export function ShareButton({ title, text, url, className = '', showLabel = false }: ShareButtonProps) {
  const { t } = useI18n()

  return (
    <button
      type="button"
      className={`btn ${className}`}
      aria-label={t('default-share')}
      title={typeof navigator.share === 'function' ? t('default-share') : t('default-copy')}
      onClick={(event) => {
        event.stopPropagation()
        const data = url ? { title, url } : { title, text }
        if (typeof navigator.share === 'function') {
          void navigator.share(data).catch(() => undefined)
        } else {
          const payload = url ?? text ?? title
          if (navigator.clipboard?.writeText) void navigator.clipboard.writeText(payload)
          else window.prompt(t('default-copy'), payload)
        }
      }}
    >
      <Share2 size={16} />
      {showLabel && t('default-share')}
    </button>
  )
}
