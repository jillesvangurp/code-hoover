import type { CSSProperties } from 'react'
import { QrCodeImage } from './QrCodeImage'

interface QrIntroFrameProps {
  text: string
  label: string
  size?: number
  className?: string
  style?: CSSProperties
}

export function QrIntroFrame({ text, label, size = 200, className = '', style }: QrIntroFrameProps) {
  return (
    <span className={`qr-intro-code-frame ${className}`} style={style}>
      <span className="qr-intro-finder qr-intro-finder-top-left" aria-hidden="true" />
      <span className="qr-intro-finder qr-intro-finder-top-right" aria-hidden="true" />
      <span className="qr-intro-finder qr-intro-finder-bottom-left" aria-hidden="true" />
      <QrCodeImage text={text} size={size} className="qr-intro-code pointer-events-none h-full w-full" alt={label} loading="lazy" />
    </span>
  )
}
