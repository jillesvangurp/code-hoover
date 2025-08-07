package qr

fun generateQrSvg(text: String, size: Int = 200): String {
    val writer = BrowserQRCodeSvgWriter()
    val element = writer.write(text, size, size)
    val dyn: dynamic = element
    return dyn.outerHTML as String
}

