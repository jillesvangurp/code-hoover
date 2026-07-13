import QRCode from 'qrcode'
import { barcodeRendererId } from '../domain/barcode'

export type CodeImageSource =
  | { kind: 'qr'; text: string }
  | { kind: 'barcode'; format: string; text: string }

const PNG_TYPE = 'image/png'

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Could not create the code image.'))
    }, PNG_TYPE)
  })
}

async function renderQrCode(text: string): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  await QRCode.toCanvas(canvas, text || ' ', {
    width: 1200,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  })
  return canvas
}

async function renderBarcode(format: string, text: string): Promise<HTMLCanvasElement> {
  const bcid = barcodeRendererId(format)
  if (!bcid) return renderQrCode(text)

  const canvas = document.createElement('canvas')
  const bwipjs = await import('bwip-js/browser')
  bwipjs.toCanvas(canvas, {
    bcid,
    text: text || ' ',
    scale: 5,
    paddingwidth: 16,
    paddingheight: 16,
    backgroundcolor: 'FFFFFF',
    barcolor: '000000',
    includetext: false,
  })
  return canvas
}

export async function createCodeImageBlob(source: CodeImageSource): Promise<Blob> {
  const canvas = source.kind === 'barcode'
    ? await renderBarcode(source.format, source.text)
    : await renderQrCode(source.text)
  return canvasToBlob(canvas)
}

export function codeImageFilename(name: string): string {
  const safeName = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `${safeName || 'code'}.png`
}

export function downloadCodeImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
