package qr

import dev.fritz2.core.*
import dev.fritz2.core.dom.RenderContext
import kotlinx.browser.window
import kotlinx.coroutines.flow.map
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import QrForm

fun RenderContext.codesScreen(
    savedCodesStore: RootStore<List<SavedQrCode>>,
    json: Json
) {
    val formStore = storeOf(QrForm())
    val editingStore = storeOf(false)

    editingStore.data.render { editing ->
        if (editing) {
            val name = formStore.sub(QrForm::name)
            val type = formStore.sub(QrForm::type)
            val url = formStore.sub(QrForm::url)
            val text = formStore.sub(QrForm::text)
            val fullName = formStore.sub(QrForm::fullName)
            val phone = formStore.sub(QrForm::phone)
            val email = formStore.sub(QrForm::email)
            val ssid = formStore.sub(QrForm::ssid)
            val password = formStore.sub(QrForm::password)
            val encryption = formStore.sub(QrForm::encryption)

            div("space-y-2") {
                input("input input-bordered w-full") {
                    placeholder("Name")
                    value(name)
                    changes.values() handledBy name.update
                }
                select("select select-bordered w-full") {
                    value(type)
                    changes.values().map { QrType.valueOf(it) } handledBy type.update
                    QrType.values().forEach {
                        option {
                            +it.name
                            value(it.name)
                        }
                    }
                }
                type.data.render { t ->
                    when (t) {
                        QrType.URL -> input("input input-bordered w-full") {
                            placeholder("Url")
                            value(url)
                            changes.values() handledBy url.update
                        }
                        QrType.TEXT -> textarea("textarea textarea-bordered w-full") {
                            placeholder("Text")
                            value(text)
                            changes.values() handledBy text.update
                        }
                        QrType.VCARD -> {
                            input("input input-bordered w-full") {
                                placeholder("Full Name")
                                value(fullName)
                                changes.values() handledBy fullName.update
                            }
                            input("input input-bordered w-full") {
                                placeholder("Phone")
                                value(phone)
                                changes.values() handledBy phone.update
                            }
                            input("input input-bordered w-full") {
                                placeholder("Email")
                                value(email)
                                changes.values() handledBy email.update
                            }
                        }
                        QrType.WIFI -> {
                            input("input input-bordered w-full") {
                                placeholder("SSID")
                                value(ssid)
                                changes.values() handledBy ssid.update
                            }
                            input("input input-bordered w-full") {
                                placeholder("Password")
                                value(password)
                                changes.values() handledBy password.update
                            }
                            input("input input-bordered w-full") {
                                placeholder("Encryption")
                                value(encryption)
                                changes.values() handledBy encryption.update
                            }
                        }
                    }
                }
                div("flex gap-2") {
                    button("btn btn-primary btn-sm") {
                        +"Save"
                        clicks handledBy {
                            val f = formStore.current
                            val data = when (f.type) {
                                QrType.URL -> QrData.Url(f.url)
                                QrType.TEXT -> QrData.Text(f.text)
                                QrType.VCARD -> QrData.VCard(f.fullName, f.phone, f.email)
                                QrType.WIFI -> QrData.Wifi(f.ssid, f.password, f.encryption)
                            }
                            val entry = SavedQrCode(f.name, data.asText(), data)
                            val list = savedCodesStore.current.toMutableList()
                            if (f.index != null) list[f.index] = entry else list.add(entry)
                            savedCodesStore.update(list)
                            editingStore.update(false)
                        }
                    }
                    button("btn btn-secondary btn-sm") {
                        +"Cancel"
                        clicks handledBy { editingStore.update(false) }
                    }
                }
            }
        } else {
            div("flex gap-2 mb-4") {
                button("btn btn-primary btn-sm") {
                    +"Add"
                    clicks handledBy {
                        formStore.update(QrForm())
                        editingStore.update(true)
                    }
                }
                button("btn btn-secondary btn-sm") {
                    +"Import"
                    clicks handledBy {
                        val txt = window.prompt("Paste JSON") ?: return@handledBy
                        try {
                            val list = json.decodeFromString<List<SavedQrCode>>(txt)
                            savedCodesStore.update(list)
                        } catch (e: Throwable) {
                            window.alert("Invalid JSON")
                        }
                    }
                }
                button("btn btn-secondary btn-sm") {
                    +"Export"
                    clicks handledBy {
                        val txt = json.encodeToString(savedCodesStore.current)
                        window.navigator.clipboard.writeText(txt)
                    }
                }
            }
            ul("space-y-4") {
                savedCodesStore.data.renderEach { code ->
                    val index = savedCodesStore.current.indexOf(code)
                    li("card bg-base-200 p-4 space-y-2") {
                        h3("font-bold") { +code.name }
                        div { unsafe { +generateQrSvg(code.text) } }
                        pre("whitespace-pre-wrap") { +code.data.format() }
                        div("flex gap-2") {
                            button("btn btn-xs btn-primary") {
                                +"Edit"
                                clicks handledBy {
                                    val f = when (val d = code.data) {
                                        is QrData.Url -> QrForm(code.name, QrType.URL, url = d.url, index = index)
                                        is QrData.Text -> QrForm(code.name, QrType.TEXT, text = d.text, index = index)
                                        is QrData.VCard -> QrForm(code.name, QrType.VCARD, fullName = d.name, phone = d.phone, email = d.email, index = index)
                                        is QrData.Wifi -> QrForm(code.name, QrType.WIFI, ssid = d.ssid, password = d.password, encryption = d.encryption, index = index)
                                    }
                                    formStore.update(f)
                                    editingStore.update(true)
                                }
                            }
                            button("btn btn-xs btn-warning") {
                                +"Delete"
                                clicks handledBy {
                                    val list = savedCodesStore.current.toMutableList()
                                    list.removeAt(index)
                                    savedCodesStore.update(list)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

