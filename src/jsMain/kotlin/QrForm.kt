import qr.QrType

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
