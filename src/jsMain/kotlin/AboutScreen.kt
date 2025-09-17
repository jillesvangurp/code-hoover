import dev.fritz2.core.*
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import kotlinx.browser.window
import localization.translate
import qr.generateQrSvg
import DefaultLangStrings

fun RenderContext.aboutScreen() {
    val repoUrl = "https://github.com/felko/code-hoover"
    val videoUrl = "https://www.youtube.com/watch?v=w5ebcowAJD8"

    div("flex flex-col items-center gap-4 text-center") {
        h2("text-xl font-bold") { translate(DefaultLangStrings.About) }
        p { translate(DefaultLangStrings.AboutIntro) }
        div("flex flex-col items-center gap-2") {
            val repoImg = img("w-32 h-32") {}
            MainScope().launch {
                val svg = generateQrSvg(repoUrl, 200)
                val encoded = window.btoa(svg)
                repoImg.domNode.setAttribute("src", "data:image/svg+xml;base64,$encoded")
            }
            a("link link-primary") {
                href(repoUrl)
                attr("target", "_blank")
                translate(DefaultLangStrings.GithubRepo)
            }
        }
        div("flex flex-col items-center gap-2") {
            val videoImg = img("w-32 h-32") {}
            MainScope().launch {
                val svg = generateQrSvg(videoUrl, 200)
                val encoded = window.btoa(svg)
                videoImg.domNode.setAttribute("src", "data:image/svg+xml;base64,$encoded")
            }
            a("link link-primary") {
                href(videoUrl)
                attr("target", "_blank")
                translate(DefaultLangStrings.VeritasiumVideo)
            }
        }
        p { translate(DefaultLangStrings.OpenSourceStatement) }
    }
}
