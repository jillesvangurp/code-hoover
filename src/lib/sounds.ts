export class SoundEffects {
  private readonly scan = this.createAudio('/sounds/bleep.wav', 0.45)
  private readonly start = this.createAudio('/sounds/app-start.wav', 0.34)
  private readonly remove = this.createAudio('/sounds/boing.wav', 0.5)
  private readonly taps = [
    this.createAudio('/sounds/warm-boop.wav', 0.3),
    this.createAudio('/sounds/tiny-blip.wav', 0.26),
    this.createAudio('/sounds/soft-tick.wav', 0.24),
  ]
  private readonly successes = [
    this.createAudio('/sounds/success-chime.wav', 0.34),
    this.createAudio('/sounds/bright-ding.wav', 0.3),
    this.createAudio('/sounds/sparkle-up.wav', 0.28),
  ]
  private readonly completes = [
    this.createAudio('/sounds/complete-pop.wav', 0.32),
    this.createAudio('/sounds/soft-confirm.wav', 0.3),
    this.createAudio('/sounds/happy-pop.wav', 0.28),
  ]
  private tapIndex = 0
  private successIndex = 0
  private completeIndex = 0

  constructor(private readonly enabled: () => boolean) {}

  private createAudio(source: string, volume: number): HTMLAudioElement {
    const audio = new Audio(source)
    audio.preload = 'auto'
    audio.volume = volume
    return audio
  }

  private play(audio: HTMLAudioElement) {
    if (!this.enabled()) return
    try {
      const playable = audio.paused ? audio : audio.cloneNode(true) as HTMLAudioElement
      playable.currentTime = 0
      void playable.play().catch(() => undefined)
    } catch {
      // Audio may be blocked until the user interacts with the page.
    }
  }

  private playFromPool(pool: HTMLAudioElement[], index: number) {
    if (!pool.length) return
    this.play(pool[index % pool.length])
  }

  playScanSuccess = () => this.play(this.scan)
  playPreview = () => this.play(this.scan)
  playTap = () => {
    this.playFromPool(this.taps, this.tapIndex)
    this.tapIndex += 1
  }
  playOpen = () => this.playFromPool(this.taps, 1)
  playToggle = () => this.playFromPool(this.taps, 2)
  playAppStart = () => this.play(this.start)
  playLoaded = () => {
    this.playFromPool(this.completes, this.completeIndex)
    this.completeIndex += 1
  }
  playComplete = () => {
    this.playFromPool(this.completes, this.completeIndex)
    this.completeIndex += 1
  }
  playSuccess = () => {
    this.playFromPool(this.successes, this.successIndex)
    this.successIndex += 1
  }
  playSave = () => this.playFromPool(this.successes, 1)
  playDelete = () => this.play(this.remove)
  playCodeLoad = () => this.playFromPool(this.taps, 2)
}
