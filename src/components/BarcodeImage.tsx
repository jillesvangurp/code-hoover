import type { ImgHTMLAttributes } from 'react'
import { useBarcodeImageSource } from '../hooks/useBarcodeImageSource'
import { QrCodeImage } from './QrCodeImage'

export interface BarcodeImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  format: string
  text: string
  fallbackSize?: number
}

export function BarcodeImage({ format, text, alt = '', fallbackSize = 200, ...props }: BarcodeImageProps) {
  const { source, failed } = useBarcodeImageSource(format, text)

  if (failed) return <QrCodeImage text={text} size={fallbackSize} alt={alt} {...props} />
  return <img src={source || undefined} alt={alt} {...props} />
}
