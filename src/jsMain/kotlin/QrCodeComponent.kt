import dev.fritz2.core.RenderContext
import dev.fritz2.core.Tag
import dev.fritz2.core.handledBy
import dev.fritz2.core.img
import kotlinx.browser.window
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.mapLatest
import org.w3c.dom.HTMLImageElement
import qr.generateQrSvg

fun RenderContext.qrCodeImage(
    text: Flow<String>,
    size: Int = 200,
    classes: String = "",
    builder: Tag<HTMLImageElement>.() -> Unit = {},
): Tag<HTMLImageElement> {
    val image = img(classes) {
        builder()
    }
    text.mapLatest { value ->
        val svg = generateQrSvg(value, size)
        window.btoa(svg)
    } handledBy { encoded ->
        image.domNode.setAttribute("src", "data:image/svg+xml;base64,$encoded")
    }
    return image
}

fun RenderContext.qrCodeImage(
    text: String,
    size: Int = 200,
    classes: String = "",
    builder: Tag<HTMLImageElement>.() -> Unit = {},
): Tag<HTMLImageElement> = qrCodeImage(flowOf(text), size, classes, builder)
