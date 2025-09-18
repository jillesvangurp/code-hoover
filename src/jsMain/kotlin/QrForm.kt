import qr.QrData
import qr.QrType
import qr.SavedQrCode
import qr.defaultDisplayName
import qr.parseVCard

data class QrForm(
    val name: String = "",
    val type: QrType = QrType.URL,
    val url: String = "",
    val text: String = "",
    val ssid: String = "",
    val password: String = "",
    val encryption: String = "WPA",
    val vcardFullName: String = "",
    val vcardFirstName: String = "",
    val vcardLastName: String = "",
    val vcardAdditionalNames: String = "",
    val vcardPrefix: String = "",
    val vcardSuffix: String = "",
    val vcardNickname: String = "",
    val vcardTitle: String = "",
    val vcardOrganization: String = "",
    val vcardEmail: String = "",
    val vcardEmailType: String = "INTERNET",
    val vcardPhone: String = "",
    val vcardPhoneType: String = "",
    val vcardUrl: String = "",
    val vcardStreet: String = "",
    val vcardCity: String = "",
    val vcardRegion: String = "",
    val vcardPostalCode: String = "",
    val vcardCountry: String = "",
    val vcardNote: String = "",
    val index: Int? = null,
)

fun QrForm.toQrData(): QrData = when (type) {
    QrType.URL -> QrData.Url(url)
    QrType.TEXT -> QrData.Text(text)
    QrType.VCARD -> QrData.VCard(
        name = vcardFullName,
        firstName = vcardFirstName,
        lastName = vcardLastName,
        additionalNames = vcardAdditionalNames,
        prefix = vcardPrefix,
        suffix = vcardSuffix,
        nickname = vcardNickname,
        title = vcardTitle,
        organization = vcardOrganization,
        email = vcardEmail,
        emailType = vcardEmailType,
        phone = vcardPhone,
        phoneType = vcardPhoneType,
        url = vcardUrl,
        street = vcardStreet,
        city = vcardCity,
        region = vcardRegion,
        postalCode = vcardPostalCode,
        country = vcardCountry,
        note = vcardNote,
    )
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
            val card = parseVCard(txt)
            if (card != null) {
                val initialName = if (name.isBlank()) card.defaultDisplayName() else name
                QrForm(
                    name = initialName,
                    type = QrType.VCARD,
                    vcardFullName = card.name,
                    vcardFirstName = card.firstName,
                    vcardLastName = card.lastName,
                    vcardAdditionalNames = card.additionalNames,
                    vcardPrefix = card.prefix,
                    vcardSuffix = card.suffix,
                    vcardNickname = card.nickname,
                    vcardTitle = card.title,
                    vcardOrganization = card.organization,
                    vcardEmail = card.email,
                    vcardEmailType = card.emailType,
                    vcardPhone = card.phone,
                    vcardPhoneType = card.phoneType,
                    vcardUrl = card.url,
                    vcardStreet = card.street,
                    vcardCity = card.city,
                    vcardRegion = card.region,
                    vcardPostalCode = card.postalCode,
                    vcardCountry = card.country,
                    vcardNote = card.note,
                    index = index,
                )
            } else {
                QrForm(name = name, type = QrType.TEXT, text = txt, index = index)
            }
        }
    }
    is QrData.VCard -> QrForm(
        name = if (name.isBlank()) d.defaultDisplayName() else name,
        type = QrType.VCARD,
        vcardFullName = d.name,
        vcardFirstName = d.firstName,
        vcardLastName = d.lastName,
        vcardAdditionalNames = d.additionalNames,
        vcardPrefix = d.prefix,
        vcardSuffix = d.suffix,
        vcardNickname = d.nickname,
        vcardTitle = d.title,
        vcardOrganization = d.organization,
        vcardEmail = d.email,
        vcardEmailType = d.emailType,
        vcardPhone = d.phone,
        vcardPhoneType = d.phoneType,
        vcardUrl = d.url,
        vcardStreet = d.street,
        vcardCity = d.city,
        vcardRegion = d.region,
        vcardPostalCode = d.postalCode,
        vcardCountry = d.country,
        vcardNote = d.note,
        index = index,
    )
}
