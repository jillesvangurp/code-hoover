interface DetectedBarcode {
  rawValue: string
  format: string
}

declare class BarcodeDetector {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>
  static getSupportedFormats(): Promise<string[]>
}
