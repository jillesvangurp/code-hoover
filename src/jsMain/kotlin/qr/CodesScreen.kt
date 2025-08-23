package qr

import dev.fritz2.core.*
import kotlinx.browser.document
import kotlinx.browser.window
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.w3c.dom.HTMLAnchorElement
import org.w3c.dom.HTMLInputElement
import org.w3c.files.FileReader
import QrForm

fun RenderContext.codesScreen(
    savedCodesStore: Store<List<SavedQrCode>>,
    json: Json
) {
    val formStore = storeOf(QrForm())
    val editingStore = storeOf(false)

    editingStore.data.render { editing ->
        if (editing) {
            div("space-y-2") {
                input("input input-bordered w-full") {
                    placeholder("Name")
                    value(formStore.data.map { it.name })
                    changes.values() handledBy formStore.handle { f, v -> f.copy(name = v) }
                }
                select("select select-bordered w-full") {
                    value(formStore.data.map { it.type.name })
                    changes.values().map { QrType.valueOf(it) } handledBy formStore.handle { f, v -> f.copy(type = v) }
                    QrType.values().forEach {
                        option {
                            +it.name
                            value(it.name)
                        }
                    }
                }
                formStore.data.map { it.type }.render { t: QrType ->
                    when (t) {
                        QrType.URL -> input("input input-bordered w-full") {
                            placeholder("Url")
                            value(formStore.data.map { it.url })
                            changes.values() handledBy formStore.handle { f, v -> f.copy(url = v) }
                        }
                        QrType.TEXT -> textarea("textarea textarea-bordered w-full") {
                            placeholder("Text")
                            value(formStore.data.map { it.text })
                            changes.values() handledBy formStore.handle { f, v -> f.copy(text = v) }
                        }
                        QrType.VCARD -> {
                            input("input input-bordered w-full") {
                                placeholder("Full Name")
                                value(formStore.data.map { it.fullName })
                                changes.values() handledBy formStore.handle { f, v -> f.copy(fullName = v) }
                            }
                            input("input input-bordered w-full") {
                                placeholder("Phone")
                                value(formStore.data.map { it.phone })
                                changes.values() handledBy formStore.handle { f, v -> f.copy(phone = v) }
                            }
                            input("input input-bordered w-full") {
                                placeholder("Email")
                                value(formStore.data.map { it.email })
                                changes.values() handledBy formStore.handle { f, v -> f.copy(email = v) }
                            }
                        }
                        QrType.WIFI -> {
                            input("input input-bordered w-full") {
                                placeholder("SSID")
                                value(formStore.data.map { it.ssid })
                                changes.values() handledBy formStore.handle { f, v -> f.copy(ssid = v) }
                            }
                            input("input input-bordered w-full") {
                                placeholder("Password")
                                value(formStore.data.map { it.password })
                                changes.values() handledBy formStore.handle { f, v -> f.copy(password = v) }
                            }
                            input("input input-bordered w-full") {
                                placeholder("Encryption")
                                value(formStore.data.map { it.encryption })
                                changes.values() handledBy formStore.handle { f, v -> f.copy(encryption = v) }
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

                val fileInput = input("hidden") {
                    type("file")
                    accept(".json")
                }.apply {
                    domNode.addEventListener("change", { event ->
                        val inputElement = event.target as HTMLInputElement
                        val file = inputElement.files?.item(0)
                        if (file != null) {
                            val reader = FileReader()
                            reader.onload = { loadEvent ->
                                val text = (loadEvent.target as FileReader).result as String
                                try {
                                    val list = json.decodeFromString<List<SavedQrCode>>(text)
                                    savedCodesStore.update(list)
                                } catch (e: Throwable) {
                                    window.alert("Invalid JSON")
                                }
                                inputElement.value = ""
                            }
                            reader.readAsText(file)
                        }
                    })
                }

                button("btn btn-secondary btn-sm") {
                    +"Import"
                    clicks handledBy {
                        fileInput.domNode.click()
                    }
                }
                button("btn btn-secondary btn-sm") {
                    +"Export"
                    clicks handledBy {
                        val txt = json.encodeToString(savedCodesStore.current)
                        val encoded = js("encodeURIComponent")(txt) as String
                        val link = document.createElement("a") as HTMLAnchorElement
                        link.href = "data:application/json;charset=utf-8,$encoded"
                        link.download = "codes.json"
                        document.body?.appendChild(link)
                        link.click()
                        document.body?.removeChild(link)
                    }
                }
            }
            ul("space-y-4") {
                savedCodesStore.data.renderEach { code ->
                    val index = savedCodesStore.current.indexOf(code)
                    li("card bg-base-200 p-4 space-y-2") {
                        h3("font-bold") { +code.name }
                        val imgElem = img {}
                        MainScope().launch {
                            val svg = generateQrSvg(code.text)
                            val encoded = window.btoa(svg)
                            imgElem.domNode.setAttribute("src", "data:image/svg+xml;base64,$encoded")
                        }
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

