import dev.fritz2.core.*
import localization.translate
import DefaultLangStrings

const val CODE_HOOVER_REPOSITORY_URL = "https://github.com/jillesvangurp/code-hoover"
const val CODE_HOOVER_APP_URL = "https://codehoover.jillesvangurp.com"

fun RenderContext.aboutScreen() {
    div("flex flex-col gap-4 text-left items-start") {
        h2("text-xl font-bold") { translate(DefaultLangStrings.About) }
        p { translate(DefaultLangStrings.AboutIntro) }
        hr {  }
        div("flex flex-col items-center gap-2 self-center") {
            qrCodeImage(CODE_HOOVER_REPOSITORY_URL, size = 200, classes = "w-32 h-32") {}
            hr("w-24 border-base-300") {}
            a("link link-primary") {
                href(CODE_HOOVER_REPOSITORY_URL)
                attr("target", "_blank")
                translate(DefaultLangStrings.GithubRepo)
            }
        }
        div("flex flex-col items-center gap-2 self-center") {
            qrCodeImage(CODE_HOOVER_APP_URL, size = 200, classes = "w-32 h-32") {}
            hr("w-24 border-base-300") {}
            a("link link-primary") {
                href(CODE_HOOVER_APP_URL)
                attr("target", "_blank")
                translate(DefaultLangStrings.OpenOnDifferentDevice)
            }
        }
        p { translate(DefaultLangStrings.MigrationInstructions) }
        hr("divider") {}
        p { translate(DefaultLangStrings.OpenSourceStatement) }
    }
}
