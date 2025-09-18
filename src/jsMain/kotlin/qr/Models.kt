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
        val firstName: String = "",
        val lastName: String = "",
        val additionalNames: String = "",
        val prefix: String = "",
        val suffix: String = "",
        val nickname: String = "",
        val title: String = "",
        val organization: String = "",
        val email: String = "",
        val emailType: String = "",
        val phone: String = "",
        val phoneType: String = "",
        val url: String = "",
        val street: String = "",
        val city: String = "",
        val region: String = "",
        val postalCode: String = "",
        val country: String = "",
        val note: String = "",
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
        val fullName = bestName().ifBlank { "vcard" }
        appendLine("FN:${fullName.escapeVCardValue()}")
        val structured = listOf(
            lastName.escapeVCardValue(),
            firstName.escapeVCardValue(),
            additionalNames.escapeVCardValue(),
            prefix.escapeVCardValue(),
            suffix.escapeVCardValue(),
        )
        if (structured.any { it.isNotBlank() }) {
            appendLine("N:${structured.joinToString(";")}")
        }
        if (nickname.isNotBlank()) appendLine("NICKNAME:${nickname.escapeVCardValue()}")
        if (title.isNotBlank()) appendLine("TITLE:${title.escapeVCardValue()}")
        if (organization.isNotBlank()) appendLine("ORG:${organization.escapeVCardValue()}")
        if (email.isNotBlank()) {
            val type = (emailType.ifBlank { "INTERNET" }).uppercase()
            appendLine("EMAIL;TYPE=$type:${email.escapeVCardValue()}")
        }
        if (phone.isNotBlank()) {
            val type = phoneType.takeIf { it.isNotBlank() }?.uppercase()
            val suffix = type?.let { ";TYPE=$it" } ?: ""
            appendLine("TEL$suffix:${phone.escapeVCardValue()}")
        }
        if (url.isNotBlank()) appendLine("URL:${url.escapeVCardValue()}")
        if (listOf(street, city, region, postalCode, country).any { it.isNotBlank() }) {
            val addressParts = listOf(
                "",
                "",
                street.escapeVCardValue(),
                city.escapeVCardValue(),
                region.escapeVCardValue(),
                postalCode.escapeVCardValue(),
                country.escapeVCardValue(),
            )
            appendLine("ADR:${addressParts.joinToString(";")}")
        }
        if (note.isNotBlank()) appendLine("NOTE:${note.escapeVCardValue()}")
        append("END:VCARD")
    }
    is QrData.Wifi -> "WIFI:T:$encryption;S:$ssid;P:$password;;"
}

fun QrData.format(): String = when (this) {
    is QrData.Url -> url
    is QrData.Text -> text
    is QrData.VCard -> listOf(
        bestName().takeIf { it.isNotBlank() }?.let {
            getTranslationString(DefaultLangStrings.NameLabel, mapOf("value" to it))
        },
        firstName.takeIf { it.isNotBlank() }?.let {
            getTranslationString(DefaultLangStrings.FirstNameLabel, mapOf("value" to it))
        },
        lastName.takeIf { it.isNotBlank() }?.let {
            getTranslationString(DefaultLangStrings.LastNameLabel, mapOf("value" to it))
        },
        additionalNames.takeIf { it.isNotBlank() }?.let {
            getTranslationString(DefaultLangStrings.AdditionalNamesLabel, mapOf("value" to it))
        },
        prefix.takeIf { it.isNotBlank() }?.let {
            getTranslationString(DefaultLangStrings.NamePrefixLabel, mapOf("value" to it))
        },
        suffix.takeIf { it.isNotBlank() }?.let {
            getTranslationString(DefaultLangStrings.NameSuffixLabel, mapOf("value" to it))
        },
        nickname.takeIf { it.isNotBlank() }?.let {
            getTranslationString(DefaultLangStrings.NicknameLabel, mapOf("value" to it))
        },
        organization.takeIf { it.isNotBlank() }?.let {
            getTranslationString(DefaultLangStrings.OrganizationLabel, mapOf("value" to it))
        },
        title.takeIf { it.isNotBlank() }?.let {
            getTranslationString(DefaultLangStrings.TitleLabel, mapOf("value" to it))
        },
        email.takeIf { it.isNotBlank() }?.let {
            val value = if (emailType.isNotBlank()) "$it (${emailType.uppercase()})" else it
            getTranslationString(DefaultLangStrings.EmailLabel, mapOf("value" to value))
        },
        phone.takeIf { it.isNotBlank() }?.let {
            val value = if (phoneType.isNotBlank()) "$it (${phoneType.uppercase()})" else it
            getTranslationString(DefaultLangStrings.PhoneLabel, mapOf("value" to value))
        },
        url.takeIf { it.isNotBlank() }?.let {
            getTranslationString(DefaultLangStrings.UrlLabel, mapOf("value" to it))
        },
        listOf(street, city, region, postalCode, country).filter { it.isNotBlank() }.takeIf { it.isNotEmpty() }?.let {
            getTranslationString(DefaultLangStrings.AddressLabel, mapOf("value" to it.joinToString(", ")))
        },
        note.takeIf { it.isNotBlank() }?.let {
            getTranslationString(DefaultLangStrings.NoteLabel, mapOf("value" to it))
        },
    ).filterNotNull().joinToString("\n")
    is QrData.Wifi -> listOf(
        getTranslationString(DefaultLangStrings.SsidLabel, mapOf("value" to ssid)),
        getTranslationString(DefaultLangStrings.PasswordLabel, mapOf("value" to password)),
        getTranslationString(DefaultLangStrings.TypeLabel, mapOf("value" to encryption)),
    ).joinToString("\n")
}

private const val VCARD_NAME_SUFFIX = " vcard"

fun QrData.defaultDisplayName(): String = when (this) {
    is QrData.Url -> url
    is QrData.Text -> text
    is QrData.Wifi -> ssid.ifBlank { asText() }
    is QrData.VCard -> displayName()
}

fun QrData.VCard.displayName(): String {
    val baseName = bestName().ifBlank {
        organization.takeIf { it.isNotBlank() }
            ?: nickname.takeIf { it.isNotBlank() }
    } ?: "vcard"
    val trimmed = baseName.trim()
    return if (trimmed.lowercase().endsWith(VCARD_NAME_SUFFIX)) trimmed else "$trimmed$VCARD_NAME_SUFFIX"
}

private fun QrData.VCard.bestName(): String {
    val direct = name.trim()
    if (direct.isNotBlank()) return direct
    val structured = listOf(prefix, firstName, additionalNames, lastName, suffix)
        .filter { it.isNotBlank() }
        .joinToString(" ")
        .trim()
    if (structured.isNotBlank()) return structured
    return organization.takeIf { it.isNotBlank() }?.trim()
        ?: nickname.takeIf { it.isNotBlank() }?.trim()
        ?: ""
}

fun parseVCard(text: String): QrData.VCard? {
    val trimmed = text.trim()
    if (!trimmed.startsWith("BEGIN:VCARD", ignoreCase = true)) return null
    val lines = unfoldVCard(trimmed)
    var name = ""
    var firstName = ""
    var lastName = ""
    var additionalNames = ""
    var prefix = ""
    var suffix = ""
    var nickname = ""
    var title = ""
    var organization = ""
    var email = ""
    var emailType = ""
    var phone = ""
    var phoneType = ""
    var url = ""
    var street = ""
    var city = ""
    var region = ""
    var postalCode = ""
    var country = ""
    var note = ""
    var hasField = false

    lines.forEach { raw ->
        val line = raw.trim()
        if (line.isEmpty()) return@forEach
        if (line.startsWith("BEGIN", ignoreCase = true) ||
            line.startsWith("END", ignoreCase = true) ||
            line.startsWith("VERSION", ignoreCase = true)
        ) return@forEach

        val idx = line.indexOf(':')
        if (idx < 0) return@forEach
        val keyPart = line.substring(0, idx)
        val valuePart = line.substring(idx + 1)
        val keySegments = keyPart.split(';')
        val key = keySegments.firstOrNull()?.uppercase() ?: return@forEach
        val params = keySegments.drop(1)
        val typeParam = extractTypeParameter(params)

        when (key) {
            "FN" -> {
                name = valuePart.unescapeVCardValue()
                if (name.isNotBlank()) hasField = true
            }
            "N" -> {
                val parts = valuePart.splitVCardComponents()
                lastName = parts.getOrNull(0) ?: ""
                firstName = parts.getOrNull(1) ?: ""
                additionalNames = parts.getOrNull(2) ?: ""
                prefix = parts.getOrNull(3) ?: ""
                suffix = parts.getOrNull(4) ?: ""
                if (parts.any { it.isNotBlank() }) hasField = true
            }
            "NICKNAME" -> {
                nickname = valuePart.unescapeVCardValue()
                if (nickname.isNotBlank()) hasField = true
            }
            "TITLE" -> {
                title = valuePart.unescapeVCardValue()
                if (title.isNotBlank()) hasField = true
            }
            "ORG" -> {
                organization = valuePart.unescapeVCardValue()
                if (organization.isNotBlank()) hasField = true
            }
            "EMAIL" -> {
                email = valuePart.unescapeVCardValue()
                if (typeParam.isNotBlank()) emailType = typeParam.replace(" ", "").uppercase()
                if (email.isNotBlank()) hasField = true
            }
            "TEL" -> {
                phone = valuePart.unescapeVCardValue()
                if (typeParam.isNotBlank()) phoneType = typeParam.replace(" ", "").uppercase()
                if (phone.isNotBlank()) hasField = true
            }
            "URL" -> {
                url = valuePart.unescapeVCardValue()
                if (url.isNotBlank()) hasField = true
            }
            "ADR" -> {
                val parts = valuePart.splitVCardComponents()
                street = parts.getOrNull(2) ?: ""
                city = parts.getOrNull(3) ?: ""
                region = parts.getOrNull(4) ?: ""
                postalCode = parts.getOrNull(5) ?: ""
                country = parts.getOrNull(6) ?: ""
                if (listOf(street, city, region, postalCode, country).any { it.isNotBlank() }) hasField = true
            }
            "NOTE" -> {
                note = valuePart.unescapeVCardValue()
                if (note.isNotBlank()) hasField = true
            }
        }
    }

    if (!hasField) return null

    return QrData.VCard(
        name = name,
        firstName = firstName,
        lastName = lastName,
        additionalNames = additionalNames,
        prefix = prefix,
        suffix = suffix,
        nickname = nickname,
        title = title,
        organization = organization,
        email = email,
        emailType = emailType,
        phone = phone,
        phoneType = phoneType,
        url = url,
        street = street,
        city = city,
        region = region,
        postalCode = postalCode,
        country = country,
        note = note,
    )
}

private fun extractTypeParameter(params: List<String>): String {
    if (params.isEmpty()) return ""
    val values = params.mapNotNull { param ->
        when {
            param.contains('=') -> {
                val (key, value) = param.split('=', limit = 2)
                if (key.equals("TYPE", ignoreCase = true)) value else null
            }
            param.isNotBlank() -> param
            else -> null
        }
    }
    return values.joinToString(",")
}

private fun unfoldVCard(text: String): List<String> {
    val result = mutableListOf<String>()
    var current: StringBuilder? = null
    text.lineSequence().forEach { raw ->
        val line = raw.trimEnd()
        if (line.startsWith(" ") || line.startsWith("\t")) {
            current?.append(line.drop(1))
        } else {
            current?.let { result.add(it.toString()) }
            current = StringBuilder(line)
        }
    }
    current?.let { result.add(it.toString()) }
    return result
}

private fun String.escapeVCardValue(): String {
    if (isEmpty()) return this
    val builder = StringBuilder(length)
    for (char in this) {
        when (char) {
            '\\' -> builder.append("\\\\")
            '\n' -> builder.append("\\n")
            '\r' -> builder.append("\\n")
            ';' -> builder.append("\\;")
            ',' -> builder.append("\\,")
            ':' -> builder.append("\\:")
            else -> builder.append(char)
        }
    }
    return builder.toString()
}

private fun String.unescapeVCardValue(): String {
    if (isEmpty()) return this
    val builder = StringBuilder(length)
    var escape = false
    for (char in this) {
        if (escape) {
            when (char) {
                'n', 'N' -> builder.append('\n')
                '\\', ';', ',', ':' -> builder.append(char)
                else -> builder.append(char)
            }
            escape = false
        } else if (char == '\\') {
            escape = true
        } else {
            builder.append(char)
        }
    }
    if (escape) builder.append('\\')
    return builder.toString()
}

private fun String.splitVCardComponents(): List<String> {
    if (isEmpty()) return listOf("")
    val result = mutableListOf<String>()
    val builder = StringBuilder()
    var escape = false
    for (char in this) {
        if (escape) {
            when (char) {
                'n', 'N' -> builder.append('\n')
                '\\', ';', ',', ':' -> builder.append(char)
                else -> builder.append(char)
            }
            escape = false
        } else {
            when (char) {
                '\\' -> escape = true
                ';' -> {
                    result.add(builder.toString())
                    builder.clear()
                }
                else -> builder.append(char)
            }
        }
    }
    if (escape) builder.append('\\')
    result.add(builder.toString())
    return result
}
