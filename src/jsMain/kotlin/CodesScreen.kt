import dev.fritz2.core.*
import kotlinx.browser.document
import kotlinx.browser.window
import kotlinx.coroutines.flow.map
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.w3c.dom.HTMLAnchorElement
import org.w3c.dom.HTMLInputElement
import org.w3c.dom.HTMLElement
import org.w3c.files.FileReader
import qr.QrData
import qr.QrType
import qr.SavedQrCode
import qr.asText
import qr.defaultDisplayName
import qr.format
import DefaultLangStrings
import localization.getTranslationString
import localization.translate
import sortable.Sortable
import sortable.SortableEvent
import sortable.sortableOptions

fun RenderContext.codesScreen(
    savedCodesStore: Store<List<SavedQrCode>>,
    json: Json
) {
    val formStore = storeOf(QrForm())
    val editingStore = storeOf(false)
    val selectedIndexStore = storeOf<Int?>(null)

    editingStore.data.render { editing ->
        if (editing) {
            div("flex flex-col gap-4 w-full") {
                qrFormFields(formStore)
                formButtons("flex flex-wrap gap-2 w-full justify-center md:justify-start", {
                    val f = formStore.current
                    val data = f.toQrData()
                    val defaultName = data.defaultDisplayName()
                    val name = if (f.name.isBlank()) defaultName else f.name
                    val entry = SavedQrCode(name, data.asText(), data)
                    val list = savedCodesStore.current.toMutableList()
                    if (f.index != null) list[f.index] = entry else list.add(entry)
                    savedCodesStore.update(list)
                    editingStore.update(false)
                }, {
                    editingStore.update(false)
                })
            }
        } else {
            div("join flex-wrap w-full justify-center md:justify-start mb-6") {
                button("btn btn-primary btn-sm w-24 flex items-center gap-1") {
                    iconPlus()
                    translate(DefaultLangStrings.Add)
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
                                        .map { saved ->
                                            if (saved.name.isBlank()) {
                                                val fallback = saved.data.defaultDisplayName().ifBlank { saved.text }
                                                saved.copy(name = fallback)
                                            } else saved
                                        }
                                    savedCodesStore.update(list)
                                } catch (e: Throwable) {
                                    window.alert(getTranslationString(DefaultLangStrings.InvalidJson))
                                }
                                inputElement.value = ""
                            }
                            reader.readAsText(file)
                        }
                    })
                }

                button("btn btn-secondary btn-sm w-24 flex items-center gap-1") {
                    iconArrowUpTray()
                    translate(DefaultLangStrings.Import)
                    clicks handledBy {
                        fileInput.domNode.click()
                    }
                }
                button("btn btn-secondary btn-sm w-24 flex items-center gap-1") {
                    iconArrowDownTray()
                    translate(DefaultLangStrings.Export)
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
            savedCodesStore.data.render { list ->
                val ulElement = ul("flex flex-col gap-4 w-full") {
                    list.withIndex().forEach { (index, code) ->
                        val displayName = code.name.ifBlank { code.text }
                        val truncated = if (displayName.length > 60) displayName.take(60) + "..." else displayName
                        li(
                            "card bg-base-200 rounded-2xl p-4 cursor-pointer w-full flex flex-col items-center gap-3 text-center"
                        ) {
                            qrCodeImage(
                                text = code.text,
                                size = 160,
                                classes = "h-24 w-24 mx-auto pointer-events-none",
                            ) {
                                attr("alt", displayName)
                                attr("loading", "lazy")
                            }
                            p("w-full truncate font-medium") { +truncated }
                            clicks handledBy { selectedIndexStore.update(index) }
                        }
                    }
                }
                Sortable(ulElement.domNode as HTMLElement, sortableOptions {
                    animation = 150
                    onEnd = { evt ->
                        val from = evt.oldIndex
                        val to = evt.newIndex
                        if (from != to) {
                            val codes = savedCodesStore.current.toMutableList()
                            val item = codes.removeAt(from)
                            codes.add(to, item)
                            savedCodesStore.update(codes)
                        }
                    }
                })
            }

            // Modal for displaying and editing selected code
            selectedIndexStore.data.render { idx ->
                if (idx != null) {
                    val initial = savedCodesStore.current[idx].toForm(idx)
                    val modalFormStore = storeOf(initial)
                    window.history.pushState(null, "", window.location.href)
                    lateinit var close: (Boolean) -> Unit
                    val keyHandler: (dynamic) -> Unit = { e ->
                        if (e.key == "Escape") close(false)
                    }
                    val popHandler: (dynamic) -> Unit = { close(true) }
                    close = { fromPop: Boolean ->
                        window.removeEventListener("keydown", keyHandler)
                        window.removeEventListener("popstate", popHandler)
                        selectedIndexStore.update(null)
                        if (!fromPop) window.history.back()
                    }
                    window.addEventListener("keydown", keyHandler)
                    window.addEventListener("popstate", popHandler)

                    div("modal modal-open") {
                        div("modal-box relative w-full h-full max-w-full space-y-4") {
                            button("btn btn-ghost btn-sm btn-circle absolute right-4 top-4") {
                                attr("type", "button")
                                attr("aria-label", getTranslationString(DefaultLangStrings.Close))
                                iconXMark()
                                clicks handledBy { close(false) }
                            }
                            qrCodeImage(
                                text = modalFormStore.data.map { it.toQrData().asText() },
                                size = 500,
                                classes = "mx-auto",
                            ) {
                                attr("alt", initial.name.ifBlank { initial.text })
                            }
                            pre("whitespace-pre-wrap break-words max-w-sm mx-auto text-left") {
                                modalFormStore.data.map { it.toQrData().format() }.renderText()
                            }
                            div("w-full max-w-sm mx-auto flex flex-col gap-2") {
                                qrFormFields(modalFormStore, showTypeSelect = false)
                            }
                            formButtons(
                                "modal-action flex flex-wrap gap-2 justify-center md:justify-end",
                                {
                                    val f = modalFormStore.current
                                    val data = f.toQrData()
                                    val defaultName = data.defaultDisplayName()
                                    val name = if (f.name.isBlank()) defaultName else f.name
                                    val entry = SavedQrCode(name, data.asText(), data)
                                    val list = savedCodesStore.current.toMutableList()
                                    list[idx] = entry
                                    savedCodesStore.update(list)
                                    close(false)
                                },
                                { close(false) },
                                onDelete = {
                                    val list = savedCodesStore.current.toMutableList()
                                    list.removeAt(idx)
                                    savedCodesStore.update(list)
                                    close(false)
                                },
                                showCancel = false
                            )
                        }
                    }
                }
            }
        }
    }
}


private fun RenderContext.qrFormFields(formStore: Store<QrForm>, showTypeSelect: Boolean = true) {
    val defaultPlaceholder = getTranslationString(DefaultLangStrings.Name)
    val nameInput = input("input input-bordered w-full") {
        placeholder(defaultPlaceholder)
        value(formStore.current.name)
        value(formStore.data.map { it.name })
        changes.values() handledBy formStore.handle { f, v -> f.copy(name = v) }
    }
    formStore.data.map { form ->
        if (form.type == QrType.VCARD) {
            form.vcardFullName.takeIf { it.isNotBlank() }?.let { "$it vcard" }
        } else null
    } handledBy { placeholderValue ->
        val value = placeholderValue ?: defaultPlaceholder
        nameInput.domNode.setAttribute("placeholder", value)
    }
    if (showTypeSelect) {
        select("select select-bordered w-full") {
            value(formStore.current.type.name)
            value(formStore.data.map { it.type.name })
            changes.values().map { QrType.valueOf(it) } handledBy formStore.handle { f, v -> f.copy(type = v) }
            QrType.values().forEach {
                option {
                    translate(
                        when (it) {
                            QrType.URL -> DefaultLangStrings.Url
                            QrType.TEXT -> DefaultLangStrings.Text
                            QrType.VCARD -> DefaultLangStrings.VCard
                            QrType.WIFI -> DefaultLangStrings.Wifi
                        }
                    )
                    value(it.name)
                }
            }
        }
    }
    formStore.data.map { it.type }.render { t: QrType ->
        when (t) {
            QrType.URL -> input("input input-bordered w-full") {
                placeholder(getTranslationString(DefaultLangStrings.Url))
                value(formStore.current.url)
                value(formStore.data.map { it.url })
                changes.values() handledBy formStore.handle { f, v -> f.copy(url = v) }
            }
            QrType.TEXT -> textFormComponent(
                formStore,
                getTranslationString(DefaultLangStrings.Text),
                { it.text },
                { f, v -> f.copy(text = v) },
                rows = 4,
            )
            QrType.VCARD -> renderVCardFields(formStore)
            QrType.WIFI -> {
                input("input input-bordered w-full") {
                    placeholder(getTranslationString(DefaultLangStrings.Ssid))
                    value(formStore.current.ssid)
                    value(formStore.data.map { it.ssid })
                    changes.values() handledBy formStore.handle { f, v -> f.copy(ssid = v) }
                }
                input("input input-bordered w-full") {
                    placeholder(getTranslationString(DefaultLangStrings.Password))
                    value(formStore.current.password)
                    value(formStore.data.map { it.password })
                    changes.values() handledBy formStore.handle { f, v -> f.copy(password = v) }
                }
                input("input input-bordered w-full") {
                    placeholder(getTranslationString(DefaultLangStrings.Encryption))
                    value(formStore.current.encryption)
                    value(formStore.data.map { it.encryption })
                    changes.values() handledBy formStore.handle { f, v -> f.copy(encryption = v) }
                }
            }
        }
    }
}

private fun RenderContext.renderVCardFields(formStore: Store<QrForm>) {
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.FullName),
        selector = { it.vcardFullName },
        updater = { form, value ->
            val updated = form.copy(vcardFullName = value)
            if (form.type == QrType.VCARD) {
                val previousDefault = form.vcardFullName.takeIf { it.isNotBlank() }?.let { "$it vcard" } ?: ""
                val shouldUpdateName = form.name.isBlank() || form.name == previousDefault
                if (shouldUpdateName) {
                    val newDefault = value.takeIf { it.isNotBlank() }?.let { "$it vcard" } ?: ""
                    updated.copy(name = newDefault)
                } else {
                    updated
                }
            } else {
                updated
            }
        },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.FirstName),
        selector = { it.vcardFirstName },
        updater = { form, value -> form.copy(vcardFirstName = value) },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.LastName),
        selector = { it.vcardLastName },
        updater = { form, value -> form.copy(vcardLastName = value) },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.AdditionalNames),
        selector = { it.vcardAdditionalNames },
        updater = { form, value -> form.copy(vcardAdditionalNames = value) },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.NamePrefix),
        selector = { it.vcardPrefix },
        updater = { form, value -> form.copy(vcardPrefix = value) },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.NameSuffix),
        selector = { it.vcardSuffix },
        updater = { form, value -> form.copy(vcardSuffix = value) },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.Nickname),
        selector = { it.vcardNickname },
        updater = { form, value -> form.copy(vcardNickname = value) },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.Title),
        selector = { it.vcardTitle },
        updater = { form, value -> form.copy(vcardTitle = value) },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.Organization),
        selector = { it.vcardOrganization },
        updater = { form, value -> form.copy(vcardOrganization = value) },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.Email),
        selector = { it.vcardEmail },
        updater = { form, value -> form.copy(vcardEmail = value) },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.EmailType),
        selector = { it.vcardEmailType },
        updater = { form, value -> form.copy(vcardEmailType = value) },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.Phone),
        selector = { it.vcardPhone },
        updater = { form, value -> form.copy(vcardPhone = value) },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.PhoneType),
        selector = { it.vcardPhoneType },
        updater = { form, value -> form.copy(vcardPhoneType = value) },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.Url),
        selector = { it.vcardUrl },
        updater = { form, value -> form.copy(vcardUrl = value) },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.Street),
        selector = { it.vcardStreet },
        updater = { form, value -> form.copy(vcardStreet = value) },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.City),
        selector = { it.vcardCity },
        updater = { form, value -> form.copy(vcardCity = value) },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.Region),
        selector = { it.vcardRegion },
        updater = { form, value -> form.copy(vcardRegion = value) },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.PostalCode),
        selector = { it.vcardPostalCode },
        updater = { form, value -> form.copy(vcardPostalCode = value) },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.Country),
        selector = { it.vcardCountry },
        updater = { form, value -> form.copy(vcardCountry = value) },
    )
    textFormComponent(
        formStore = formStore,
        placeholder = getTranslationString(DefaultLangStrings.Note),
        selector = { it.vcardNote },
        updater = { form, value -> form.copy(vcardNote = value) },
        rows = 3,
    )
}

private fun RenderContext.textFormComponent(
    formStore: Store<QrForm>,
    placeholder: String,
    selector: (QrForm) -> String,
    updater: (QrForm, String) -> QrForm,
    rows: Int = 1,
) {
    textarea("textarea textarea-bordered w-full") {
        placeholder(placeholder)
        attr("rows", rows.coerceAtLeast(1).toString())
        value(selector(formStore.current))
        value(formStore.data.map(selector))
        changes.values() handledBy formStore.handle { form, value -> updater(form, value) }
    }
}

private fun RenderContext.formButtons(
    classes: String,
    onSave: () -> Unit,
    onCancel: (() -> Unit)? = null,
    onDelete: (() -> Unit)? = null,
    showCancel: Boolean = onCancel != null,
) {
    div(classes) {
        button("btn btn-primary btn-sm flex items-center gap-1") {
            iconCheck()
            translate(DefaultLangStrings.Save)
            clicks handledBy { onSave() }
        }
        if (showCancel && onCancel != null) {
            button("btn btn-secondary btn-sm flex items-center gap-1") {
                iconXMark()
                translate(DefaultLangStrings.Cancel)
                clicks handledBy { onCancel() }
            }
        }
        onDelete?.let {
            button("btn btn-warning btn-sm flex items-center gap-1") {
                iconTrash()
                translate(DefaultLangStrings.Delete)
                clicks handledBy { it() }
            }
        }
    }
}

