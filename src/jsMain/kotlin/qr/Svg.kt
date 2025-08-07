package qr

import kotlin.js.JsName

@JsModule("@zxing/browser")
@JsNonModule
@JsName("BrowserQRCodeSvgWriter")
external class BrowserQRCodeSvgWriter {
    fun write(contents: String, width: Int, height: Int): dynamic
}

fun generateQrSvg(text: String, size: Int = 200): String {
    val writer = BrowserQRCodeSvgWriter()
    val element = writer.write(text, size, size)
    val dyn: dynamic = element
    return dyn.outerHTML as String
}
