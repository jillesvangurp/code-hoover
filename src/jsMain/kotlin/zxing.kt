@file:JsModule("@zxing/library")
@file:JsNonModule

import kotlin.js.Promise

external interface ZXingResult {
    val format: Int
    val text: String
}

external class BrowserMultiFormatReader(
    hints: dynamic,
    timeBetweenScansMillis: Int
) {
    fun decodeOnceFromVideoDevice(
        deviceId: String?,
        videoElementId: String?,
    ): Promise<ZXingResult>

    fun decodeFromInputVideoDeviceContinuously(
        deviceId: String?,
        videoSource: String?,
        callbackFn: (ZXingResult?, Throwable?) -> Unit
    ): Promise<Unit>

    fun stopContinuousDecode()

    fun stopAsyncDecode()

    fun reset()
}
