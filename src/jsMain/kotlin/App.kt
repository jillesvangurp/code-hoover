import com.tryformation.localization.Translatable
import dev.fritz2.core.storeOf
import localization.Locales
import localization.TranslationStore
import localization.translate

suspend fun main() {

    // starts up koin and initializes the TranslationStore
    startAppWithKoin {
        val codeReader = BrowserMultiFormatReader(
            hints = null,
            timeBetweenScansMillis = 300,
        )
        val scansStore = storeOf(listOf<String>())
        val scanningStore = storeOf(false)
        article("p-5") {
            h1("text-red-700") {
                translate(DefaultLangStrings.PageTitle)
            }
            scanningStore.data.render {scanning ->
                if(scanning) {
                    button("btn btn-primary btn-xs sm:btn-sm md:btn-md lg:btn-lg xl:btn-xl") {
                        translate(DefaultLangStrings.Stop)
                        clicks handledBy {
                            console.log("STOP")
                            codeReader.stopContinuousDecode()
                            scanningStore.update(false)
                        }
                    }

                } else {
                    button("btn btn-primary btn-xs sm:btn-sm md:btn-md lg:btn-lg xl:btn-xl") {
                        translate(DefaultLangStrings.Scan)

                        clicks handledBy {
                            codeReader.decodeFromInputVideoDeviceContinuously(null, "video") { result, err ->
                                if (result != null) {
                                    console.log(result)
                                    val text = result.text
                                    val existing = scansStore.current
                                    scansStore.update(
                                        if (text !in existing) existing + text else existing,
                                    )
                                }
                            }
                            scanningStore.update(true)

                        }
                    }
                }
            }
        }
        p {
            translate(DefaultLangStrings.WelcomeText)
        }

        video("m-5 h-1/2", id = "video") {

        }

        ul {
            scansStore.data.renderEach {
                li {
                    +it
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
    Stop
    ;

    // fluent files have identifiers with this prefix and the camel
    // case of the enum value converted to lower case with dashes.
    override val prefix: String
        get() = "default"
}
