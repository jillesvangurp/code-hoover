import com.tryformation.localization.Translatable
import dev.fritz2.core.*
import kotlinx.browser.document
import kotlinx.browser.localStorage
import kotlinx.browser.window
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import qr.SavedQrCode
import localization.Locales
import localization.TranslationStore
import localization.getTranslationString
import localization.translate
import org.w3c.dom.HTMLElement


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
    if (ordinal in barcodeFormatNames.indices) barcodeFormatNames[ordinal]
    else getTranslationString(DefaultLangStrings.Unknown)

private const val darkMode = "qr-dark"

private const val lightMode = "qr-light"

enum class Screen { Codes, Scan, About }

suspend fun main() {

    // starts up koin and initializes the TranslationStore
    startAppWithKoin {
        val html = document.documentElement!!
        val prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        html.setAttribute("data-theme", if (prefersDark) darkMode else lightMode)

        val codeReader = BrowserMultiFormatReader(
            hints = null,
            options = js("{ delayBetweenScanAttempts: 300 }")
        )
        val scansStore = storeOf(listOf<ScanResult>())
        val scanningStore = storeOf(false)
        val json = Json { prettyPrint = true }
        val savedCodesStore = storeOf(listOf<SavedQrCode>())
        localStorage.getItem("codes")?.let {
            try {
                val stored = json.decodeFromString<List<SavedQrCode>>(it)
                    .map { c -> if (c.name.isBlank()) c.copy(name = c.text) else c }
                savedCodesStore.update(stored)
            } catch (_: Throwable) {
            }
        }
        savedCodesStore.data.onEach { codes ->
            localStorage.setItem("codes", json.encodeToString(codes))
        }.launchIn(MainScope())
        val screenStore = storeOf(Screen.Codes)
        val translationStore = withKoin { get<TranslationStore>() }
        div("min-h-screen flex flex-col items-center text-base-content px-4 py-6 sm:py-10") {
            article(
                "w-full max-w-xl lg:max-w-3xl bg-base-100 shadow-xl rounded-3xl p-6 sm:p-10 flex flex-col gap-6 flex-grow"
            ) {
                div("flex flex-wrap items-center justify-between gap-4") {
                    div("flex items-center gap-3") {
                        img("h-10 w-10 dark:invert") {
                            attr("src", "/favicon.svg")
                            attr("alt", "Code Hoover logo")
                        }
                        h1("text-2xl sm:text-3xl font-bold text-primary") {
                            translate(DefaultLangStrings.PageTitle)
                        }
                    }
                    div("dropdown dropdown-end") {
                        label("btn btn-ghost btn-circle") {
                            tabIndex(0)
                            iconBars()
                        }
                        ul("menu menu-sm dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52") {
                            tabIndex(0)
                            li {
                                button("w-full text-left") {
                                    translate(DefaultLangStrings.About)
                                    clicks handledBy {
                                        screenStore.update(Screen.About)
                                        (document.activeElement as? HTMLElement)?.blur()
                                    }
                                }
                            }
                            li {
                                translationStore.data.render { currentBundle ->
                                    val currentLocale = currentBundle.bundles.first().locale.first()
                                    div("flex gap-2") {
                                        Locales.entries.forEach { locale ->
                                            val flag = when (locale) {
                                                Locales.EN_US -> "🇺🇸"
                                                Locales.DE_DE -> "🇩🇪"
                                                Locales.NL_NL -> "🇳🇱"
                                                Locales.FR_FR -> "🇫🇷"
                                                Locales.JA_JP -> "🇯🇵"
                                            }
                                            button(
                                                "btn btn-ghost btn-sm w-8 text-2xl filter grayscale hover:grayscale-0 " +
                                                    if (currentLocale == locale.title) "grayscale-0" else "",
                                            ) {
                                                +flag
                                                attr("aria-label", locale.title)
                                                clicks handledBy {
                                                    translationStore.updateLocale(locale.title)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            li {
                                val darkStore = storeOf(prefersDark)
                                darkStore.data.render { isDark ->
                                    button(
                                        "swap swap-rotate " + if (isDark) "swap-active" else "",
                                    ) {
                                        attr("title", getTranslationString(DefaultLangStrings.DarkMode))
                                        clicks handledBy {
                                            val html = document.documentElement!!
                                            val newTheme = if (isDark) lightMode else darkMode
                                            html.setAttribute("data-theme", newTheme)
                                            darkStore.update(!isDark)
                                        }
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
                screenStore.data.render { screen ->
                    div("tabs tabs-boxed justify-center mb-6") {
                        val active = "bg-neutral text-neutral-content"
                        val inactive = "bg-base-100 text-base-content hover:bg-neutral hover:text-neutral-content"
                        a(
                            "tab " + (if (screen == Screen.Codes) "tab-active $active" else inactive),
                        ) {
                            translate(DefaultLangStrings.Codes)
                            clicks handledBy { screenStore.update(Screen.Codes) }
                        }
                        a(
                            "tab " + (if (screen == Screen.Scan) "tab-active $active" else inactive),
                        ) {
                            translate(DefaultLangStrings.Scan)
                            clicks handledBy { screenStore.update(Screen.Scan) }
                        }
                    }
                    when (screen) {
                        Screen.Codes -> {
                            codesScreen(savedCodesStore, json)
                        }
                        Screen.Scan -> {
                            scanScreen(
                                scanningStore,
                                scansStore,
                                codeReader,
                                savedCodesStore,
                                json,
                            )
                        }
                        Screen.About -> {
                            aboutScreen()
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
    DarkMode,
    Codes,
    Open,
    Save,
    Delete,
    Add,
    Import,
    Export,
    Cancel,
    Close,
    ScannedCodes,
    InvalidJson,
    Name,
    Url,
    Text,
    VCard,
    Wifi,
    FullName,
    Phone,
    Email,
    Ssid,
    Password,
    Encryption,
    Unknown,
    NameLabel,
    PhoneLabel,
    EmailLabel,
    SsidLabel,
    PasswordLabel,
    TypeLabel,
    About,
    AboutIntro,
    GithubRepo,
    VeritasiumVideo,
    OpenSourceStatement,
    ;

    // fluent files have identifiers with this prefix and the camel
    // case of the enum value converted to lower case with dashes.
    override val prefix: String
        get() = "default"
}
