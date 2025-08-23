package qr

import kotlinx.coroutines.await
import qrcode.toString

external class Object

inline fun obj(init: dynamic.() -> Unit): dynamic = (Object()).apply(init)

suspend fun generateQrSvg(text: String, size: Int = 200): String {
    return toString(
        text,
        obj {
            this.type = "svg"
            this.width = size
            this.margin = 0
        }
    ).await()
}

