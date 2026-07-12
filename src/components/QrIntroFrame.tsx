import type { CSSProperties } from 'react'
import { useState } from 'react'
import { QrCodeImage } from './QrCodeImage'

interface QrIntroFrameProps {
  text: string
  label: string
  size?: number
  className?: string
  style?: CSSProperties
  expandable?: boolean
}

export function QrIntroFrame({ text, label, size = 200, className = '', style, expandable = false }: QrIntroFrameProps) {
  const [expanded, setExpanded] = useState(false)
  const toggleExpanded = () => {
    if (expandable) setExpanded((current) => !current)
  }
  const frameClassName = `qr-intro-code-frame ${expanded ? 'qr-detail-code-frame-expanded' : ''} ${expandable ? 'qr-detail-code-frame-expandable' : ''} ${className}`

  const content = (
    <>
      <span className="qr-intro-finder qr-intro-finder-top-left" aria-hidden="true" />
      <span className="qr-intro-finder qr-intro-finder-top-right" aria-hidden="true" />
      <span className="qr-intro-finder qr-intro-finder-bottom-left" aria-hidden="true" />
      <QrCodeImage text={text} size={size} className="qr-intro-code pointer-events-none h-full w-full" alt={label} loading="lazy" />
    </>
  )

  if (!expandable) {
    return (
      <span className={frameClassName} style={style}>
        {content}
      </span>
    )
  }

  return (
    <button
      type="button"
      className={frameClassName}
      style={style}
      aria-label={expanded ? `Shrink ${label}` : `Enlarge ${label}`}
      aria-pressed={expanded}
      onClick={toggleExpanded}
    >
      {content}
    </button>
  )
}
