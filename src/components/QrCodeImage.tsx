import QRCode from 'qrcode'
import { useEffect, useState, type ImgHTMLAttributes } from 'react'

interface QrCodeImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  text: string
  size?: number
  margin?: number
}

export function QrCodeImage({ text, size = 200, margin = 0, alt = '', ...props }: QrCodeImageProps) {
  const [source, setSource] = useState('')

  useEffect(() => {
    let active = true
    void QRCode.toDataURL(text || ' ', { width: size, margin }).then((url) => {
      if (active) setSource(url)
    })
    return () => { active = false }
  }, [margin, size, text])

  return <img src={source || undefined} alt={alt} {...props} />
}
