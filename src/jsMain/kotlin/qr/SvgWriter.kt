@file:JsModule("@zxing/browser")
@file:JsNonModule

package qr

external class BrowserQRCodeSvgWriter {
    fun write(contents: String, width: Int, height: Int): dynamic
}

