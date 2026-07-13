import { useEffect, useState } from 'react'
import { barcodeRendererId } from '../domain/barcode'

export function useBarcodeImageSource(format: string, text: string) {
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

  return { source, failed }
}
