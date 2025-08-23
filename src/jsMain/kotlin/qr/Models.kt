package qr

import kotlinx.serialization.Serializable

@Serializable
enum class QrType {
    URL, TEXT, VCARD, WIFI
}

@Serializable
sealed class QrData {
    @Serializable
    data class Url(val url: String) : QrData()

    @Serializable
    data class Text(val text: String) : QrData()

    @Serializable
    data class VCard(
        val name: String,
        val phone: String = "",
        val email: String = "",
    ) : QrData()

    @Serializable
    data class Wifi(
        val ssid: String,
        val password: String,
        val encryption: String = "WPA",
    ) : QrData()
}

@Serializable
data class SavedQrCode(
    val name: String,
    val text: String,
    val data: QrData,
)

fun QrData.asText(): String = when (this) {
    is QrData.Url -> url
    is QrData.Text -> text
    is QrData.VCard -> buildString {
        appendLine("BEGIN:VCARD")
        appendLine("VERSION:3.0")
        appendLine("FN:$name")
        if (phone.isNotBlank()) appendLine("TEL:$phone")
        if (email.isNotBlank()) appendLine("EMAIL:$email")
        append("END:VCARD")
    }
    is QrData.Wifi -> "WIFI:T:$encryption;S:$ssid;P:$password;;"
}

fun QrData.format(): String = when (this) {
    is QrData.Url -> url
    is QrData.Text -> text
    is QrData.VCard -> listOf(
        "Name: $name",
        phone.takeIf { it.isNotBlank() }?.let { "Phone: $it" },
        email.takeIf { it.isNotBlank() }?.let { "Email: $it" },
    ).filterNotNull().joinToString("\n")
    is QrData.Wifi -> "SSID: $ssid\nPassword: $password\nType: $encryption"
}
