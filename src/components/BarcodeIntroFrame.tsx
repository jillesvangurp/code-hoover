import { useState, type ImgHTMLAttributes, type ReactNode } from 'react'
import { useBarcodeImageSource } from '../hooks/useBarcodeImageSource'
import { useI18n } from '../i18n/context'
import { QrCodeImage } from './QrCodeImage'

interface BarcodeIntroFrameProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  format: string
  text: string
  fallbackSize?: number
  imageClassName?: string
  expandable?: boolean
}

export function BarcodeIntroFrame({
  format,
  text,
  fallbackSize = 200,
  alt = '',
  className = '',
  imageClassName = '',
  expandable = false,
  ...imageProps
}: BarcodeIntroFrameProps) {
  const { t } = useI18n()
  const { source, failed } = useBarcodeImageSource(format, text)
  const [expanded, setExpanded] = useState(false)
  const frameClassName = `barcode-intro-frame ${source ? 'barcode-intro-frame-ready' : ''} ${expanded ? 'barcode-detail-frame-expanded' : ''} ${expandable ? 'barcode-detail-frame-expandable' : ''} ${className}`

  const content: ReactNode = failed ? (
    <span className="barcode-intro-scan-surface">
      <QrCodeImage text={text} size={fallbackSize} className={`barcode-intro-code ${imageClassName}`} alt={alt} {...imageProps} />
    </span>
  ) : (
    <>
      {source && <img src={source} className="barcode-intro-matrix" alt="" aria-hidden="true" />}
      <span className="barcode-intro-scan-surface">
        <img src={source || undefined} className={`barcode-intro-code ${imageClassName}`} alt={alt} {...imageProps} />
      </span>
    </>
  )

  if (expandable) {
    return (
      <button
        type="button"
        className={frameClassName}
        aria-label={t(expanded ? 'default-shrink-code' : 'default-enlarge-code', { name: alt })}
        aria-pressed={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        {content}
      </button>
    )
  }

  return (
    <span className={frameClassName}>
      {content}
    </span>
  )
}
