import kotlin.js.Promise

external class BarcodeDetector(options: BarcodeDetectorOptions = definedExternally) {
    fun detect(source: dynamic): Promise<Array<DetectedBarcode>>

    companion object {
        fun getSupportedFormats(): Promise<Array<String>>
    }
}

external interface BarcodeDetectorOptions {
    var formats: Array<String>?
}

external interface DetectedBarcode {
    val rawValue: String
    val format: String
}
