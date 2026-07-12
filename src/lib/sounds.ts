export class SoundEffects {
  private readonly scan = this.createAudio('/sounds/bleep.wav', 0.45)
  private readonly tap = this.createAudio('/sounds/warm-boop.wav', 0.32)
  private readonly start = this.createAudio('/sounds/app-start.wav', 0.34)
  private readonly success = this.createAudio('/sounds/success-chime.wav', 0.36)
  private readonly complete = this.createAudio('/sounds/complete-pop.wav', 0.34)
  private readonly save = this.createAudio('/sounds/success-chime.wav', 0.28)
  private readonly remove = this.createAudio('/sounds/boing.wav', 0.5)

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
      audio.currentTime = 0
      void audio.play().catch(() => undefined)
    } catch {
      // Audio may be blocked until the user interacts with the page.
    }
  }

  playScanSuccess = () => this.play(this.scan)
  playPreview = () => this.play(this.scan)
  playTap = () => this.play(this.tap)
  playOpen = () => this.play(this.tap)
  playToggle = () => this.play(this.tap)
  playAppStart = () => this.play(this.start)
  playLoaded = () => this.play(this.complete)
  playComplete = () => this.play(this.complete)
  playSuccess = () => this.play(this.success)
  playSave = () => this.play(this.save)
  playDelete = () => this.play(this.remove)
}
