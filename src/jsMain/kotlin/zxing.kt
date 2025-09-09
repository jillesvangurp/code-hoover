@file:JsModule("@zxing/browser")
@file:JsNonModule

import kotlin.js.Promise

external interface ZXingResult {
    val format: Int
    val text: String
}

external interface IScannerControls {
    fun stop()
}

external class BrowserMultiFormatReader(
    hints: dynamic = definedExternally,
    options: dynamic = definedExternally,
) {
    fun decodeOnceFromVideoDevice(
        deviceId: String?,
        videoElementId: String?,
    ): Promise<ZXingResult>

    fun decodeFromVideoDevice(
        deviceId: String?,
        videoSource: String?,
        callbackFn: (ZXingResult?, Throwable?, IScannerControls) -> Unit,
    ): Promise<IScannerControls>

    fun reset()
}

