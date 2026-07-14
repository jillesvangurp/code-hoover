interface DetectedBarcode {
  rawValue: string
  format: string
  boundingBox: DOMRectReadOnly
  cornerPoints: Array<{ x: number; y: number }>
}

declare class BarcodeDetector {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>
  static getSupportedFormats(): Promise<string[]>
}
