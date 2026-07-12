import { useState } from 'react'
import { ExternalLink, Globe } from 'lucide-react'
import { useI18n } from '../i18n/context'

interface UrlPreviewProps {
  url: string
  compact?: boolean
  featured?: boolean
}

function parseUrl(url: string): URL | null {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

export function UrlPreview({ url, compact = false, featured = false }: UrlPreviewProps) {
  const [faviconFailed, setFaviconFailed] = useState(false)
  const parsed = parseUrl(url)
  const { t } = useI18n()
  const host = parsed?.hostname.replace(/^www\./, '') || url
  const path = parsed ? `${parsed.pathname}${parsed.search}` : ''
  const faviconUrl = parsed ? `${parsed.origin}/favicon.ico` : ''

  const content = (
    <>
      <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-base-300 bg-white text-black ${featured ? 'h-14 w-14' : 'h-10 w-10'}`}>
        {faviconUrl && !faviconFailed ? (
          <img className={`${featured ? 'h-8 w-8' : 'h-6 w-6'} object-contain`} src={faviconUrl} alt="" loading="lazy" onError={() => setFaviconFailed(true)} />
        ) : (
          <Globe size={featured ? 28 : 20} aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className={`block truncate font-semibold ${featured ? 'text-xl' : 'text-sm'}`}>{host}</span>
        <span className={`block truncate opacity-70 ${featured ? 'text-sm' : 'text-xs'}`}>{path && path !== '/' ? path : parsed?.protocol.replace(':', '') || url}</span>
      </span>
      {!compact && <span className="btn btn-ghost btn-xs shrink-0"><ExternalLink size={14} />{t('default-open')}</span>}
    </>
  )

  const className = `group flex min-w-0 items-center gap-3 rounded-lg border border-base-300 bg-base-100 text-base-content no-underline transition-colors ${compact ? 'mt-3 p-3' : `w-full hover:border-neutral hover:bg-base-200 ${featured ? 'min-h-32 p-5 shadow-xl' : 'mx-auto max-w-sm p-3'}`}`

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
