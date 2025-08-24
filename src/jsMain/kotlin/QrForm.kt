import qr.QrType
import qr.QrData
import qr.SavedQrCode

data class QrForm(
    val name: String = "",
    val type: QrType = QrType.URL,
    val url: String = "",
    val text: String = "",
    val ssid: String = "",
    val password: String = "",
    val encryption: String = "WPA",
    val index: Int? = null,
)

fun QrForm.toQrData(): QrData = when (type) {
    QrType.URL -> QrData.Url(url)
    QrType.TEXT, QrType.VCARD -> QrData.Text(text)
    QrType.WIFI -> QrData.Wifi(ssid, password, encryption)
}

fun SavedQrCode.toForm(index: Int? = null): QrForm = when (val d = data) {
    is QrData.Url -> QrForm(name = name, type = QrType.URL, url = d.url, index = index)
    is QrData.Wifi -> QrForm(
        name = name,
        type = QrType.WIFI,
        ssid = d.ssid,
        password = d.password,
        encryption = d.encryption,
        index = index,
    )
    is QrData.Text -> {
        val txt = d.text
        if (txt.startsWith("WIFI:")) {
            val params = txt.removePrefix("WIFI:").split(';').mapNotNull { part ->
                val idx = part.indexOf(':')
                if (idx > 0) part.substring(0, idx) to part.substring(idx + 1) else null
            }.toMap()
            QrForm(
                name = name,
                type = QrType.WIFI,
                ssid = params["S"] ?: "",
                password = params["P"] ?: "",
                encryption = params["T"] ?: "WPA",
                index = index,
            )
        } else if (txt.startsWith("http://") || txt.startsWith("https://")) {
            QrForm(name = name, type = QrType.URL, url = txt, index = index)
        } else {
            QrForm(name = name, type = QrType.TEXT, text = txt, index = index)
        }
    }
    is QrData.VCard -> QrForm(name = name, type = QrType.TEXT, text = this.text, index = index)
}
