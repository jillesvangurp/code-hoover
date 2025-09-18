import dev.fritz2.core.*
import localization.translate
import DefaultLangStrings

fun RenderContext.aboutScreen() {
    val repoUrl = "https://github.com/felko/code-hoover"
    val videoUrl = "https://www.youtube.com/watch?v=w5ebcowAJD8"

    div("flex flex-col items-center gap-4 text-center") {
        h2("text-xl font-bold") { translate(DefaultLangStrings.About) }
        p { translate(DefaultLangStrings.AboutIntro) }
        div("flex flex-col items-center gap-2") {
            qrCodeImage(repoUrl, size = 200, classes = "w-32 h-32") {}
            a("link link-primary") {
                href(repoUrl)
                attr("target", "_blank")
                translate(DefaultLangStrings.GithubRepo)
            }
        }
        div("flex flex-col items-center gap-2") {
            qrCodeImage(videoUrl, size = 200, classes = "w-32 h-32") {}
            a("link link-primary") {
                href(videoUrl)
                attr("target", "_blank")
                translate(DefaultLangStrings.VeritasiumVideo)
            }
        }
        p { translate(DefaultLangStrings.OpenSourceStatement) }
    }
}
