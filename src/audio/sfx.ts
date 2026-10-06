// PLACEHOLDER (Phase 7 batch H: sounds). Keep this API; the app already calls it.

/** The game's sounds, generated with the Web Audio API (no audio files). */
export type Sound = 'click' | 'sparkle' | 'chirp'

/** Play a sound if sound is on. Safe to call anywhere, any time. */
export function play(sound: Sound): void {
  void sound
}

/** Whether sound is on (remembered per device). */
export function soundOn(): boolean {
  return false
}

export function setSoundOn(on: boolean): void {
  void on
}
