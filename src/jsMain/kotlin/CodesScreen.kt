import dev.fritz2.core.*
import kotlinx.browser.document
import kotlinx.browser.window
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.w3c.dom.DragEvent
import org.w3c.dom.HTMLAnchorElement
import org.w3c.dom.HTMLInputElement
import org.w3c.dom.HTMLLIElement
import org.w3c.dom.HTMLUListElement
import org.w3c.dom.HTMLElement
import org.w3c.files.FileReader
import qr.QrData
import qr.QrType
import qr.SavedQrCode
import qr.asText
import qr.format
import qr.generateQrSvg
import DefaultLangStrings
import localization.getTranslationString
import localization.translate

fun RenderContext.codesScreen(
    savedCodesStore: Store<List<SavedQrCode>>,
    json: Json
) {
    val formStore = storeOf(QrForm())
    val editingStore = storeOf(false)
    val selectedIndexStore = storeOf<Int?>(null)

    editingStore.data.render { editing ->
        if (editing) {
            div("flex flex-col gap-4") {
                qrFormFields(formStore)
                formButtons("flex gap-2", {
                    val f = formStore.current
                    val data = f.toQrData()
                    val name = if (f.name.isBlank()) data.asText() else f.name
                    val entry = SavedQrCode(name, data.asText(), data)
                    val list = savedCodesStore.current.toMutableList()
                    if (f.index != null) list[f.index] = entry else list.add(entry)
                    savedCodesStore.update(list)
                    editingStore.update(false)
                }) {
                    editingStore.update(false)
                }
            }
        } else {
            div("join flex-wrap mb-6") {
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
                                        .map { if (it.name.isBlank()) it.copy(name = it.text) else it }
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
            val placeholder = (document.createElement("li") as HTMLLIElement).apply {
                className = "card border-2 border-dashed border-primary h-16 my-2"
            }
            var draggedIndex: Int? = null

            fun getDragAfterElement(container: HTMLUListElement, y: Double): HTMLElement? {
                var closestOffset = Double.NEGATIVE_INFINITY
                var closest: HTMLElement? = null
                val children = container.children
                for (i in 0 until children.length) {
                    val child = children.item(i) as HTMLElement
                    if (child == placeholder || child.classList.contains("dragging")) continue
                    val box = child.getBoundingClientRect()
                    val offset = y - box.top - box.height / 2
                    if (offset < 0 && offset > closestOffset) {
                        closestOffset = offset
                        closest = child
                    }
                }
                return closest
            }

            ul("flex flex-col gap-4 w-full") {
                val container = domNode as HTMLUListElement

                container.addEventListener("dragover", { event ->
                    event as DragEvent
                    event.preventDefault()
                    val after = getDragAfterElement(container, event.clientY.toDouble())
                    if (after == null) {
                        container.appendChild(placeholder)
                    } else {
                        container.insertBefore(placeholder, after)
                    }
                })

                container.addEventListener("drop", { event ->
                    event as DragEvent
                    event.preventDefault()
                    val from = draggedIndex ?: return@addEventListener
                    val children = container.children
                    val placeholderIdx = (0 until children.length).firstOrNull { children.item(it) == placeholder }
                        ?: return@addEventListener
                    placeholder.remove()
                    val list = savedCodesStore.current.toMutableList()
                    val item = list.removeAt(from)
                    var to = placeholderIdx
                    if (from < to) to -= 1
                    list.add(to, item)
                    savedCodesStore.update(list)
                    draggedIndex = null
                })

                container.addEventListener("dragleave", { event ->
                    event as DragEvent
                    if (event.target == container) {
                        placeholder.remove()
                    }
                })

                savedCodesStore.data.map { it.withIndex().toList() }.renderEach { indexed ->
                    val index = indexed.index
                    val code = indexed.value
                    val displayName = code.name.ifBlank { code.text }
                    val truncated = if (displayName.length > 60) displayName.take(60) + "..." else displayName
                    li("card bg-base-200 p-4 flex justify-between items-center cursor-pointer w-full") {
                        attr("draggable", "true")
                        p("mr-2 flex-grow truncate") { +truncated }
                        button("btn btn-xs btn-warning w-24 flex items-center gap-1") {
                            iconTrash()
                            translate(DefaultLangStrings.Delete)
                            clicks.map { it.stopPropagation(); Unit } handledBy {
                                val list = savedCodesStore.current.toMutableList()
                                list.removeAt(index)
                                savedCodesStore.update(list)
                            }
                        }
                        domNode.addEventListener("dragstart", { e ->
                            e as DragEvent
                            draggedIndex = index
                            (domNode as HTMLElement).classList.add("dragging")
                            placeholder.style.height = "${domNode.getBoundingClientRect().height}px"
                            e.dataTransfer?.effectAllowed = "move"
                        })
                        domNode.addEventListener("dragend", { _ ->
                            placeholder.remove()
                            (domNode as HTMLElement).classList.remove("dragging")
                            draggedIndex = null
                        })
                        clicks handledBy { selectedIndexStore.update(index) }
                    }
                }
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
                        div("modal-box w-full h-full max-w-full space-y-4") {
                            val imgElem = img("mx-auto") {}
                            modalFormStore.data.map { it.toQrData().asText() }.handledBy { txt ->
                                MainScope().launch {
                                    val svg = generateQrSvg(txt, 500)
                                    val encoded = window.btoa(svg)
                                    imgElem.domNode.setAttribute("src", "data:image/svg+xml;base64,$encoded")
                                }
                            }
                            pre("whitespace-pre-wrap break-words max-w-sm mx-auto text-left") {
                                modalFormStore.data.map { it.toQrData().format() }.renderText()
                            }
                            div("w-full max-w-sm mx-auto flex flex-col gap-2") {
                                qrFormFields(modalFormStore, showTypeSelect = false)
                            }
                            formButtons("modal-action justify-center", {
                                val f = modalFormStore.current
                                val data = f.toQrData()
                                val name = if (f.name.isBlank()) data.asText() else f.name
                                val entry = SavedQrCode(name, data.asText(), data)
                                val list = savedCodesStore.current.toMutableList()
                                list[idx] = entry
                                savedCodesStore.update(list)
                                close(false)
                            }) {
                                close(false)
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun RenderContext.qrFormFields(formStore: Store<QrForm>, showTypeSelect: Boolean = true) {
    input("input input-bordered w-full") {
        placeholder(getTranslationString(DefaultLangStrings.Name))
        value(formStore.current.name)
        value(formStore.data.map { it.name })
        changes.values() handledBy formStore.handle { f, v -> f.copy(name = v) }
    }
    if (showTypeSelect) {
        select("select select-bordered w-full") {
            value(formStore.current.type.name)
            value(formStore.data.map { it.type.name })
            changes.values().map { QrType.valueOf(it) } handledBy formStore.handle { f, v -> f.copy(type = v) }
            QrType.values().filter { it != QrType.VCARD }.forEach {
                option {
                    translate(
                        when (it) {
                            QrType.URL -> DefaultLangStrings.Url
                            QrType.TEXT -> DefaultLangStrings.Text
                            QrType.WIFI -> DefaultLangStrings.Wifi
                            else -> DefaultLangStrings.Text
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
            QrType.TEXT -> textarea("textarea textarea-bordered w-full") {
                placeholder(getTranslationString(DefaultLangStrings.Text))
                value(formStore.current.text)
                value(formStore.data.map { it.text })
                changes.values() handledBy formStore.handle { f, v -> f.copy(text = v) }
            }
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
            else -> {}
        }
    }
}

private fun RenderContext.formButtons(classes: String, onSave: () -> Unit, onCancel: () -> Unit) {
    div(classes) {
        button("btn btn-primary btn-sm flex items-center gap-1") {
            iconCheck()
            translate(DefaultLangStrings.Save)
            clicks handledBy { onSave() }
        }
        button("btn btn-secondary btn-sm flex items-center gap-1") {
            iconXMark()
            translate(DefaultLangStrings.Cancel)
            clicks handledBy { onCancel() }
        }
    }
}

