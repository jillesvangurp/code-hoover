import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { barcodeRendererId } from '../domain/barcode'
import { QrCodeImage } from './QrCodeImage'

interface BarcodeImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  format: string
  text: string
  fallbackSize?: number
}

export function BarcodeImage({ format, text, alt = '', fallbackSize = 200, ...props }: BarcodeImageProps) {
  const [source, setSource] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    const bcid = barcodeRendererId(format)
    if (!bcid) {
      setSource('')
      setFailed(true)
      return () => { active = false }
    }

    void import('bwip-js/browser').then((bwipjs) => {
      const svg = bwipjs.toSVG({
        bcid,
        text: text || ' ',
        scale: 2,
        paddingwidth: 8,
        paddingheight: 8,
        backgroundcolor: 'FFFFFF',
        barcolor: '000000',
        includetext: false,
      })
      if (!active) return
      setSource(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
      setFailed(false)
    }).catch(() => {
      if (!active) return
      setSource('')
      setFailed(true)
    })

    return () => { active = false }
  }, [format, text])

  if (failed) return <QrCodeImage text={text} size={fallbackSize} alt={alt} {...props} />
  return <img src={source || undefined} alt={alt} {...props} />
}
