export class SoundEffects {
  private readonly scan = this.createAudio('/sounds/bleep.wav', 0.45)
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
  playDelete = () => this.play(this.remove)
}
