package qr

import kotlinx.serialization.Serializable
import DefaultLangStrings
import localization.getTranslationString

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
        getTranslationString(DefaultLangStrings.NameLabel, mapOf("value" to name)),
        phone.takeIf { it.isNotBlank() }?.let {
            getTranslationString(DefaultLangStrings.PhoneLabel, mapOf("value" to it))
        },
        email.takeIf { it.isNotBlank() }?.let {
            getTranslationString(DefaultLangStrings.EmailLabel, mapOf("value" to it))
        },
    ).filterNotNull().joinToString("\n")
    is QrData.Wifi -> listOf(
        getTranslationString(DefaultLangStrings.SsidLabel, mapOf("value" to ssid)),
        getTranslationString(DefaultLangStrings.PasswordLabel, mapOf("value" to password)),
        getTranslationString(DefaultLangStrings.TypeLabel, mapOf("value" to encryption)),
    ).joinToString("\n")
}
