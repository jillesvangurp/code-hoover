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
        when {
            txt.startsWith("BEGIN:VCARD") -> {
                val lines = txt.lines()
                val fn = lines.find { it.startsWith("FN:") }?.substring(3) ?: ""
                val phone = lines.find { it.startsWith("TEL:") }?.substring(4) ?: ""
                val email = lines.find { it.startsWith("EMAIL:") }?.substring(6) ?: ""
                QrForm(name, QrType.VCARD, fullName = fn, phone = phone, email = email, index = index)
            }
            txt.startsWith("WIFI:") -> {
                val ssid = Regex("S:([^;]+)").find(txt)?.groupValues?.get(1) ?: ""
                val password = Regex("P:([^;]+)").find(txt)?.groupValues?.get(1) ?: ""
                val enc = Regex("T:([^;]+)").find(txt)?.groupValues?.get(1) ?: "WPA"
                QrForm(name, QrType.WIFI, ssid = ssid, password = password, encryption = enc, index = index)
            }
            txt.startsWith("http://") || txt.startsWith("https://") -> QrForm(name, QrType.URL, url = txt, index = index)
            else -> QrForm(name, QrType.TEXT, text = txt, index = index)
        }
    }
    is QrData.VCard -> QrForm(name, QrType.VCARD, fullName = d.name, phone = d.phone, email = d.email, index = index)
    is QrData.Wifi -> QrForm(name, QrType.WIFI, ssid = d.ssid, password = d.password, encryption = d.encryption, index = index)
}
