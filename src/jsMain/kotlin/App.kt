import com.tryformation.localization.Translatable
import dev.fritz2.core.storeOf
import kotlinx.browser.window
import localization.Locales
import localization.TranslationStore
import localization.translate

data class ScanResult(val text: String, val format: Int)

private val barcodeFormatNames = arrayOf(
    "AZTEC",
    "CODABAR",
    "CODE_39",
    "CODE_93",
    "CODE_128",
    "DATA_MATRIX",
    "EAN_8",
    "EAN_13",
    "ITF",
    "MAXICODE",
    "PDF_417",
    "QR_CODE",
    "RSS_14",
    "RSS_EXPANDED",
    "UPC_A",
    "UPC_E",
    "UPC_EAN_EXTENSION",
)

fun barcodeFormatName(ordinal: Int): String =
    if (ordinal in barcodeFormatNames.indices) barcodeFormatNames[ordinal] else "Unknown"

suspend fun main() {

    // starts up koin and initializes the TranslationStore
    startAppWithKoin {
        val codeReader = BrowserMultiFormatReader(
            hints = null,
            timeBetweenScansMillis = 300,
        )
        val scansStore = storeOf(listOf<ScanResult>())
        val scanningStore = storeOf(false)
        article("p-4 max-w-screen-sm mx-auto space-y-4") {
            h1("text-red-700 text-center") {
                translate(DefaultLangStrings.PageTitle)
            }
            scanningStore.data.render { scanning ->
                div("flex gap-2 justify-center") {
                    if (scanning) {
                        button("btn btn-error btn-sm") {
                            translate(DefaultLangStrings.Stop)
                            clicks handledBy {
                                codeReader.stopContinuousDecode()
                                scanningStore.update(false)
                            }
                        }
                    } else {
                        button("btn btn-primary btn-sm") {
                            translate(DefaultLangStrings.Scan)
                            clicks handledBy {
                                codeReader.decodeFromInputVideoDeviceContinuously(null, "video") { result, _ ->
                                    if (result != null) {
                                        val text = result.text
                                        val format = result.format
                                        val existing = scansStore.current
                                        if (existing.none { it.text == text }) {
                                            scansStore.update(existing + ScanResult(text, format))
                                        }
                                    }
                                }
                                scanningStore.update(true)
                            }
                        }
                    }
                    button("btn btn-secondary btn-sm") {
                        translate(DefaultLangStrings.Clear)
                        clicks handledBy {
                            scansStore.update(emptyList())
                        }
                    }
                }
            }

            p {
                translate(DefaultLangStrings.WelcomeText)
            }

            scanningStore.data.render { scanning ->
                if (scanning) {
                    video("mx-auto w-full h-[33vh] border rounded-md", id = "video") {}
                }
            }

            ul("space-y-2") {
                scansStore.data.renderEach { scan ->
                    li("card bg-base-200 p-3") {
                        p("break-words") { +scan.text }
                        p("text-sm opacity-70") { +barcodeFormatName(scan.format) }
                        button("btn btn-outline btn-xs mt-2") {
                            attrs { title = "Copy" }
                            +"Copy"
                            clicks handledBy {
                                window.navigator.clipboard.writeText(scan.text)
                            }
                        }
                    }
                }
            }
        }

        // here's how you do stuff with the translation store
        withKoin {
            val translationStore = get<TranslationStore>()
            translationStore.data.render { currentBundle ->
                val currentLocale = currentBundle.bundles.first().locale.first()
                div("flex flex-row gap-2.5") {
                    Locales.entries.forEach { locale ->
                        if (currentLocale == locale.title) {
                            p {
                                em {
                                    +locale.title
                                }
                            }
                        } else {
                            a {
                                +locale.title
                                clicks handledBy {
                                    translationStore.updateLocale(locale.title)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}


// you can use enums for translatable strings
enum class DefaultLangStrings : Translatable {
    PageTitle,
    WelcomeText,
    Scan,
    Stop,
    Clear
    ;

    // fluent files have identifiers with this prefix and the camel
    // case of the enum value converted to lower case with dashes.
    override val prefix: String
        get() = "default"
}
