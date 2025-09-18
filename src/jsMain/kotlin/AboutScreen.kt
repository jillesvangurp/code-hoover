import dev.fritz2.core.*
import localization.translate
import DefaultLangStrings

fun RenderContext.aboutScreen() {
    val repoUrl = "https://github.com/felko/code-hoover"
    val videoUrl = "https://www.youtube.com/watch?v=w5ebcowAJD8"
    val differentDeviceUrl = "https://codehoover.jillesvangurp.com"

    div("flex flex-col gap-4 text-left items-start") {
        h2("text-xl font-bold") { translate(DefaultLangStrings.About) }
        p { translate(DefaultLangStrings.AboutIntro) }
        hr {  }
        div("flex flex-col items-center gap-2 self-center") {
            qrCodeImage(repoUrl, size = 200, classes = "w-32 h-32") {}
            a("link link-primary") {
                href(repoUrl)
                attr("target", "_blank")
                translate(DefaultLangStrings.GithubRepo)
            }
        }
        div("flex flex-col items-center gap-2 self-center") {
            qrCodeImage(videoUrl, size = 200, classes = "w-32 h-32") {}
            a("link link-primary") {
                href(videoUrl)
                attr("target", "_blank")
                translate(DefaultLangStrings.VeritasiumVideo)
            }
        }
        div("flex flex-col items-center gap-2 self-center") {
            qrCodeImage(differentDeviceUrl, size = 200, classes = "w-32 h-32") {}
            a("link link-primary") {
                href(differentDeviceUrl)
                attr("target", "_blank")
                translate(DefaultLangStrings.OpenOnDifferentDevice)
            }
        }
        p { translate(DefaultLangStrings.MigrationInstructions) }
        hr("divider") {}
        p { translate(DefaultLangStrings.OpenSourceStatement) }
    }
}
