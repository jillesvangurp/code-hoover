import { useState } from 'react'
import { ExternalLink, Globe } from 'lucide-react'
import { useI18n } from '../i18n/context'

interface UrlPreviewProps {
  url: string
  compact?: boolean
}

function parseUrl(url: string): URL | null {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

export function UrlPreview({ url, compact = false }: UrlPreviewProps) {
  const [faviconFailed, setFaviconFailed] = useState(false)
  const parsed = parseUrl(url)
  const { t } = useI18n()
  const host = parsed?.hostname.replace(/^www\./, '') || url
  const path = parsed ? `${parsed.pathname}${parsed.search}` : ''
  const faviconUrl = parsed ? `${parsed.origin}/favicon.ico` : ''

  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-base-300 bg-white text-black">
        {faviconUrl && !faviconFailed ? (
          <img className="h-6 w-6 object-contain" src={faviconUrl} alt="" loading="lazy" onError={() => setFaviconFailed(true)} />
        ) : (
          <Globe size={20} aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-semibold">{host}</span>
        <span className="block truncate text-xs opacity-70">{path && path !== '/' ? path : parsed?.protocol.replace(':', '') || url}</span>
      </span>
      {!compact && <span className="btn btn-ghost btn-xs shrink-0"><ExternalLink size={14} />{t('default-open')}</span>}
    </>
  )

  const className = `group flex min-w-0 items-center gap-3 rounded-lg border border-base-300 bg-base-100 p-3 text-base-content no-underline transition-colors ${compact ? 'mt-3' : 'mx-auto w-full max-w-sm hover:border-neutral hover:bg-base-200'}`

  if (compact) {
    return <div className={className}>{content}</div>
  }

  return (
    <a
      className={className}
      href={parsed?.href || url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
    >
      {content}
    </a>
  )
}
