import dev.fritz2.core.Store
import kotlinx.browser.document
import org.w3c.dom.HTMLAudioElement

class SoundEffects(private val soundEnabledStore: Store<Boolean>) {

    private val scanSound: HTMLAudioElement = createAudio("/sounds/bleep.wav", 0.45)
    private val deleteSound: HTMLAudioElement = createAudio("/sounds/boing.wav", 0.5)

    private fun createAudio(src: String, volume: Double): HTMLAudioElement {
        val audio = document.createElement("audio") as HTMLAudioElement
        audio.src = src
        audio.preload = "auto"
        audio.volume = volume
        return audio
    }

    private fun HTMLAudioElement.safePlay() {
        if (!soundEnabledStore.current) return
        try {
            currentTime = 0.0
            play().catch { _ -> }
        } catch (_: Throwable) {
        }
    }

    fun playScanSuccess() = scanSound.safePlay()

    fun playDelete() = deleteSound.safePlay()
}
