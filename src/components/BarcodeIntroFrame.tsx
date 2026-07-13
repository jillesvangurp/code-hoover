import type { ImgHTMLAttributes } from 'react'
import { useBarcodeImageSource } from '../hooks/useBarcodeImageSource'
import { QrCodeImage } from './QrCodeImage'

interface BarcodeIntroFrameProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  format: string
  text: string
  fallbackSize?: number
  imageClassName?: string
}

export function BarcodeIntroFrame({
  format,
  text,
  fallbackSize = 200,
  alt = '',
  className = '',
  imageClassName = '',
  ...imageProps
}: BarcodeIntroFrameProps) {
  const { source, failed } = useBarcodeImageSource(format, text)

  if (failed) {
    return (
      <span className={`barcode-intro-frame ${className}`}>
        <span className="barcode-intro-scan-surface">
          <QrCodeImage text={text} size={fallbackSize} className={`barcode-intro-code ${imageClassName}`} alt={alt} {...imageProps} />
        </span>
      </span>
    )
  }

  return (
    <span className={`barcode-intro-frame ${source ? 'barcode-intro-frame-ready' : ''} ${className}`}>
      {source && <img src={source} className="barcode-intro-matrix" alt="" aria-hidden="true" />}
      <span className="barcode-intro-scan-surface">
        <img src={source || undefined} className={`barcode-intro-code ${imageClassName}`} alt={alt} {...imageProps} />
      </span>
    </span>
  )
}
