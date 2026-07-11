export const BARCODE_FORMAT_NAMES = [
  'AZTEC', 'CODABAR', 'CODE_39', 'CODE_93', 'CODE_128', 'DATA_MATRIX', 'EAN_8', 'EAN_13', 'ITF',
  'MAXICODE', 'PDF_417', 'QR_CODE', 'RSS_14', 'RSS_EXPANDED', 'UPC_A', 'UPC_E', 'UPC_EAN_EXTENSION',
]

export function barcodeFormatName(format: number, unknown = 'Unknown'): string {
  return BARCODE_FORMAT_NAMES[format] ?? unknown
}

export function barcodeRendererId(format: string): string | null {
  switch (format) {
    case 'AZTEC': return 'azteccode'
    case 'CODABAR': return 'rationalizedCodabar'
    case 'CODE_39': return 'code39'
    case 'CODE_93': return 'code93'
    case 'CODE_128': return 'code128'
    case 'DATA_MATRIX': return 'datamatrix'
    case 'EAN_8': return 'ean8'
    case 'EAN_13': return 'ean13'
    case 'ITF': return 'interleaved2of5'
    case 'MAXICODE': return 'maxicode'
    case 'PDF_417': return 'pdf417'
    case 'QR_CODE': return 'qrcode'
    case 'RSS_14': return 'databaromni'
    case 'RSS_EXPANDED': return 'databarexpanded'
    case 'UPC_A': return 'upca'
    case 'UPC_E': return 'upce'
    default: return null
  }
}

export function isQrBarcodeFormat(format: string): boolean {
  return format === 'QR_CODE'
}
