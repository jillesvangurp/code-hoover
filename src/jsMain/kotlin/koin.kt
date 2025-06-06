import dev.fritz2.core.RenderContext
import dev.fritz2.core.render
import dev.fritz2.core.storeOf
import kotlinx.coroutines.Job
import localization.TranslationStore
import org.koin.core.Koin
import org.koin.core.context.GlobalContext
import org.koin.core.context.startKoin

inline fun <T> withKoin(block: Koin.() -> T): T = with(GlobalContext.get()) {
    block(this)
}

suspend fun startAppWithKoin(ui: RenderContext.()->Unit) {
    startKoin {
        modules(
            // add your modules here
        )
    }
    withKoin {
        // load is a suspend function
        // so we declare this component last
        declare(TranslationStore.load(storeOf("en-US", Job()), fallback = "en-US"))

        render("#target", content=ui)
    }
}
