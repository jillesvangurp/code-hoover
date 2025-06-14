import com.tryformation.localization.Translatable
import dev.fritz2.core.storeOf
import kotlinx.browser.document
import kotlinx.browser.window
import localization.Locales
import localization.TranslationStore
import localization.getTranslationString
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

private const val darkMode = "night"

private const val lightMode = "emerald"

suspend fun main() {

    // starts up koin and initializes the TranslationStore
    startAppWithKoin {
        val codeReader = BrowserMultiFormatReader(
            hints = null,
            timeBetweenScansMillis = 300,
        )
        val scansStore = storeOf(listOf<ScanResult>())
        val scanningStore = storeOf(false)
        val translationStore = withKoin { get<TranslationStore>() }
        div("min-h-screen flex flex-col") {
            article("p-4 max-w-screen-sm mx-auto space-y-4 flex-grow") {
                h1("text-center text-2xl sm:text-3xl font-bold text-primary") {
                    translate(DefaultLangStrings.PageTitle)
                }
                scanningStore.data.render { scanning ->
                    div("flex gap-2 justify-center") {
                        if (scanning) {
                            button("btn btn-error btn-sm hover:opacity-80 active:opacity-60 transition") {
                                translate(DefaultLangStrings.Stop)
                                clicks handledBy {
                                    codeReader.stopContinuousDecode()
                                    scanningStore.update(false)
                                }
                            }
                        } else {
                            button("btn btn-primary btn-sm hover:opacity-80 active:opacity-60 transition") {
                                translate(DefaultLangStrings.Scan)
                                clicks handledBy {
                                    codeReader.decodeFromInputVideoDeviceContinuously(
                                        null,
                                        "video",
                                    ) { result, _ ->
                                        if (result != null) {
                                            val text = result.text
                                            val format = result.format
                                            val existing = scansStore.current
                                            if (existing.none { it.text == text }) {
                                                scansStore.update(
                                                    listOf(
                                                        ScanResult(
                                                            text,
                                                            format,
                                                        ),
                                                    ) + existing,
                                                )
                                            }
                                        }
                                    }
                                    scanningStore.update(true)
                                }
                            }
                        }
                        button("btn btn-secondary btn-sm hover:opacity-80 active:opacity-60 transition") {
                            translate(DefaultLangStrings.Clear)
                            clicks handledBy {
                                scansStore.update(emptyList())
                            }
                        }
                    }
                    div("mt-5") {

                        if (!scanning) {
                            p {
                                translate(DefaultLangStrings.WelcomeText)
                            }
                        } else {
                            video("mx-auto w-full h-[33vh] border rounded-md", id = "video") {}
                        }
                    }

                }

                scansStore.data.render { scans ->
                    p("font-semibold mb-2") { +"${scans.size} scanned codes" }
                }

                ul("space-y-2") {
                    scansStore.data.renderEach { scan ->
                        li("card bg-base-200 p-3") {
                            p("break-words font-mono") { +scan.text }
                            p("text-xs opacity-70") { +barcodeFormatName(scan.format) }
                            div("mt-2 flex gap-2") {
                                button("btn btn-primary btn-xs hover:opacity-80 active:opacity-60 transition") {
                                    attr("title", getTranslationString(DefaultLangStrings.Copy))
                                    translate(DefaultLangStrings.Copy)
                                    clicks handledBy {
                                        window.navigator.clipboard.writeText(scan.text)
                                    }
                                }
                                if (scan.text.startsWith("http://") || scan.text.startsWith("https://")) {
                                    button("btn btn-secondary btn-xs hover:opacity-80 active:opacity-60 transition") {
                                        +"Open"
                                        clicks handledBy {
                                            window.open(scan.text, "_blank")
                                        }
                                    }
                                }
                                button("btn btn-warning btn-xs hover:opacity-80 active:opacity-60 transition") {
                                    +"Delete"
                                    clicks handledBy {
                                        scansStore.update(scansStore.current.filterNot { it == scan })
                                    }
                                }
                            }
                        }
                    }
                }
            }

            footer("mt-auto p-4 text-center space-y-2 ") {
                div("flex flex-row justify-center items-center gap-4") {


                    translationStore.data.render { currentBundle ->
                        val currentLocale = currentBundle.bundles.first().locale.first()
                        Locales.entries.forEach { locale ->
                            if (currentLocale == locale.title) {
                                a {
                                    em { +locale.title }
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

                        label("swap swap-rotate") {
                            input {
                                attr("type", "checkbox")
                                className("theme-controller")

                                clicks handledBy {
                                    val html = document.documentElement!!
                                    val current = html.getAttribute("data-theme")
                                    val prefersDark =
                                        window.matchMedia("(prefers-color-scheme: dark)").matches
                                    val newTheme = when (current) {
                                        darkMode -> lightMode
                                        lightMode -> darkMode
                                        else -> if (prefersDark) lightMode else darkMode
                                    }
                                    html.setAttribute("data-theme", newTheme)
                                }
                            }

                            // Sun icon
                            svg("swap-off h-10 w-10 fill-current") {
                                attr("xmlns", "http://www.w3.org/2000/svg")
                                attr("viewBox", "0 0 24 24")
                                path {
                                    attr(
                                        "d",
                                        "M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z",
                                    )
                                }
                            }

                            // Moon icon
                            svg("swap-on h-10 w-10 fill-current") {
                                attr("xmlns", "http://www.w3.org/2000/svg")
                                attr("viewBox", "0 0 24 24")
                                path {
                                    attr(
                                        "d",
                                        "M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z",
                                    )
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
    Clear,
    Copy,
    DarkMode
    ;

    // fluent files have identifiers with this prefix and the camel
    // case of the enum value converted to lower case with dashes.
    override val prefix: String
        get() = "default"
}
