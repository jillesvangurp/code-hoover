import qr.QrType
import qr.QrData
import qr.SavedQrCode

data class QrForm(
    val name: String = "",
    val type: QrType = QrType.URL,
    val url: String = "",
    val text: String = "",
    val fullName: String = "",
    val phone: String = "",
    val email: String = "",
    val ssid: String = "",
    val password: String = "",
    val encryption: String = "WPA",
    val index: Int? = null,
)

fun QrForm.toQrData(): QrData = when (type) {
    QrType.URL -> QrData.Url(url)
    QrType.TEXT -> QrData.Text(text)
    QrType.VCARD -> QrData.VCard(fullName, phone, email)
    QrType.WIFI -> QrData.Wifi(ssid, password, encryption)
}

fun SavedQrCode.toForm(index: Int? = null): QrForm = when (val d = data) {
    is QrData.Url -> QrForm(name, QrType.URL, url = d.url, index = index)
    is QrData.Text -> {
        val txt = d.text
        if (txt.startsWith("http://") || txt.startsWith("https://")) {
            QrForm(name, QrType.URL, url = txt, index = index)
        } else {
            QrForm(name, QrType.TEXT, text = txt, index = index)
        }
    }
    else -> QrForm(name, QrType.TEXT, text = this.text, index = index)
}
