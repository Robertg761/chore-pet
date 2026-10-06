// Pure note and envelope maths plus the sound recipes. No Web Audio calls here,
// so it can be unit tested in node. sfx.ts turns these into oscillators.

export type Sound = 'click' | 'sparkle' | 'chirp'

export type Wave = 'sine' | 'triangle'

/** One oscillator voice. Times are seconds from the moment the sound starts. */
export interface Voice {
  wave: Wave
  /** Start frequency in Hz. */
  hz: number
  /** If set, the pitch glides (exponentially) to this over `glide` seconds. */
  endHz?: number
  glide?: number
  /** Slight detune in cents. */
  cents?: number
  start: number
  /** Total length including the fade out. */
  duration: number
  /** Time to reach the peak. */
  attack: number
  /** Relative loudness, 0 to 1 (the master gain does the rest). */
  peak: number
  /** Little pitch wobble: LFO rate in Hz and depth in Hz. */
  warble?: { rate: number; depth: number }
}

/** Quietest value an exponential ramp may use (it cannot reach zero). */
export const SILENCE = 0.0001

/** Overall output level; every sound is soft. */
export const MASTER_GAIN = 0.15

/** Gentle low-pass that rounds off the top end. */
export const LOWPASS_HZ = 4800

/** MIDI note number to frequency (A4 = 69 = 440 Hz). */
export function midiToHz(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12)
}

/** Cents to a frequency ratio. */
export function centsToRatio(cents: number): number {
  return Math.pow(2, cents / 1200)
}

export interface EnvelopeStep {
  time: number
  gain: number
}

/**
 * Gain curve for a voice, as points joined by exponential ramps: silent,
 * quickly up to the peak, then a smooth fade to silence at the end.
 */
export function envelopeSteps(voice: Pick<Voice, 'start' | 'duration' | 'attack' | 'peak'>): EnvelopeStep[] {
  const attack = Math.min(Math.max(voice.attack, 0.001), voice.duration / 2)
  const peak = Math.max(voice.peak, SILENCE)
  return [
    { time: voice.start, gain: SILENCE },
    { time: voice.start + attack, gain: peak },
    { time: voice.start + voice.duration, gain: SILENCE },
  ]
}

/** One bell-like note: a sine, a quiet higher partial and a faint detuned twin. */
function bell(note: number, start: number, duration: number, peak: number): Voice[] {
  const hz = midiToHz(note)
  return [
    { wave: 'sine', hz, start, duration, attack: 0.006, peak, cents: -4 },
    { wave: 'sine', hz: hz * 2.01, start, duration: duration * 0.6, attack: 0.004, peak: peak * 0.22, cents: 5 },
    { wave: 'sine', hz, start, duration: duration * 0.8, attack: 0.006, peak: peak * 0.4, cents: 7 },
  ]
}

const SPARKLE_NOTES = [72, 76, 79, 84] // C E G C, going up
const SPARKLE_STEP = 0.095

const RECIPES: Record<Sound, Voice[]> = {
  // A soft wooden "tok": a short triangle with a fast pitch drop, plus a tiny tick.
  click: [
    { wave: 'triangle', hz: 720, endHz: 240, glide: 0.03, start: 0, duration: 0.045, attack: 0.002, peak: 1 },
    { wave: 'sine', hz: 1500, endHz: 700, glide: 0.015, start: 0, duration: 0.02, attack: 0.001, peak: 0.25 },
  ],
  // A rising arpeggio of bells with a little high shimmer at the end.
  sparkle: [
    ...SPARKLE_NOTES.flatMap((note, i) =>
      bell(note, i * SPARKLE_STEP, i === SPARKLE_NOTES.length - 1 ? 0.2 : 0.16, 0.8),
    ),
    {
      wave: 'sine',
      hz: midiToHz(96),
      start: 0.3,
      duration: 0.15,
      attack: 0.01,
      peak: 0.12,
      warble: { rate: 22, depth: 25 },
    },
  ],
  // A quick upward glide with a warble, then a short answering blip.
  chirp: [
    {
      wave: 'sine',
      hz: 650,
      endHz: 1450,
      glide: 0.1,
      start: 0,
      duration: 0.12,
      attack: 0.01,
      peak: 0.9,
      warble: { rate: 32, depth: 45 },
    },
    { wave: 'sine', hz: 1050, endHz: 1750, glide: 0.06, start: 0.1, duration: 0.08, attack: 0.008, peak: 0.6 },
  ],
}

/** The oscillator voices that make up a sound. */
export function recipeFor(sound: Sound): Voice[] {
  return RECIPES[sound]
}

/** Seconds until the last voice has faded out. */
export function soundDuration(sound: Sound): number {
  return Math.max(...RECIPES[sound].map((v) => v.start + v.duration))
}

/** Parse the stored sound setting; anything unexpected means the default. */
export function parseSoundSetting(stored: string | null, fallback: boolean): boolean {
  if (stored === 'on') return true
  if (stored === 'off') return false
  return fallback
}

/** Whether a click target counts as button-like for the click sound. */
export const CLICKABLE_SELECTOR = 'button, [role="button"], [role="radio"], [role="tab"]'
export const SILENT_SELECTOR = '[data-sound="none"]'
