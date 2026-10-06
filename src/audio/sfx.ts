// Sounds, generated with the Web Audio API (no audio files).
// The audio context is only made after a user gesture, because browsers block
// audio before one. Until then, play() is a silent no-op. Nothing here throws.

import {
  CLICKABLE_SELECTOR,
  LOWPASS_HZ,
  MASTER_GAIN,
  SILENCE,
  SILENT_SELECTOR,
  centsToRatio,
  envelopeSteps,
  parseSoundSetting,
  recipeFor,
  type Sound,
  type Voice,
} from './synth'

/** The game's sounds, generated with the Web Audio API (no audio files). */
export type { Sound } from './synth'

const STORAGE_KEY = 'chore-pet:sound'
/** On by default (very quiet, and silent until the first tap anyway). */
const DEFAULT_ON = true

type ContextCtor = typeof AudioContext

interface Chain {
  ctx: AudioContext
  input: AudioNode
}

let chain: Chain | null = null
let unlocked = false
let enabled: boolean | null = null

function contextCtor(): ContextCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { AudioContext?: ContextCtor; webkitAudioContext?: ContextCtor }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

function ensureChain(): Chain | null {
  try {
    if (!chain) {
      const Ctor = contextCtor()
      if (!Ctor) return null
      const ctx = new Ctor()
      const lowpass = ctx.createBiquadFilter()
      lowpass.type = 'lowpass'
      lowpass.frequency.value = LOWPASS_HZ
      lowpass.Q.value = 0.7
      const master = ctx.createGain()
      master.gain.value = MASTER_GAIN
      lowpass.connect(master)
      master.connect(ctx.destination)
      chain = { ctx, input: lowpass }
    }
    if (chain.ctx.state === 'suspended') void chain.ctx.resume().catch(() => {})
    return chain
  } catch {
    return null
  }
}

/** Called from a real user gesture: allows audio and wakes the context. */
function unlock(): void {
  unlocked = true
  ensureChain()
}

const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'] as const

function listenForGesture(): void {
  if (typeof document === 'undefined') return
  const onGesture = () => {
    unlock()
    if (chain?.ctx.state === 'running') {
      for (const name of UNLOCK_EVENTS) document.removeEventListener(name, onGesture, true)
    }
  }
  for (const name of UNLOCK_EVENTS) document.addEventListener(name, onGesture, true)
}
listenForGesture()

function startVoice(ctx: AudioContext, input: AudioNode, voice: Voice, t0: number): void {
  const start = t0 + voice.start
  const end = t0 + voice.start + voice.duration
  const osc = ctx.createOscillator()
  osc.type = voice.wave
  const ratio = centsToRatio(voice.cents ?? 0)
  osc.frequency.setValueAtTime(voice.hz * ratio, start)
  if (voice.endHz !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(voice.endHz * ratio, start + (voice.glide ?? voice.duration))
  }

  const gain = ctx.createGain()
  const [from, up, down] = envelopeSteps(voice)
  gain.gain.setValueAtTime(Math.max(from.gain, SILENCE), t0 + from.time)
  gain.gain.exponentialRampToValueAtTime(up.gain, t0 + up.time)
  gain.gain.exponentialRampToValueAtTime(down.gain, t0 + down.time)
  osc.connect(gain)
  gain.connect(input)

  if (voice.warble) {
    const lfo = ctx.createOscillator()
    const depth = ctx.createGain()
    lfo.frequency.value = voice.warble.rate
    depth.gain.value = voice.warble.depth
    lfo.connect(depth)
    depth.connect(osc.frequency)
    lfo.start(start)
    lfo.stop(end + 0.02)
  }

  osc.start(start)
  osc.stop(end + 0.02)
}

function synthesise(sound: Sound): void {
  const c = ensureChain()
  if (!c) return
  const t0 = c.ctx.currentTime + 0.005
  for (const voice of recipeFor(sound)) startVoice(c.ctx, c.input, voice, t0)
}

/** Play a sound if sound is on. Safe to call anywhere, any time. */
export function play(sound: Sound): void {
  try {
    if (!unlocked || !soundOn()) return
    synthesise(sound)
  } catch {
    // Sound is a nicety; never break the app for it.
  }
}

/** Whether sound is on (remembered per device). */
export function soundOn(): boolean {
  if (enabled === null) {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(STORAGE_KEY)
    } catch {
      // Storage can be blocked; use the default.
    }
    enabled = parseSoundSetting(stored, DEFAULT_ON)
  }
  return enabled
}

export function setSoundOn(on: boolean): void {
  enabled = on
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    // Not remembered, but still applies for this visit.
  }
  // Turning it on is a tap, so give a little confirmation.
  if (on) play('click')
}

/**
 * One delegated listener that plays a soft click for button-like elements.
 * Opt out with data-sound="none". Returns a cleanup function.
 */
export function installClickSounds(): () => void {
  if (typeof document === 'undefined') return () => {}
  const onDown = (e: Event) => {
    try {
      unlock()
      const target = e.target
      if (!(target instanceof Element)) return
      const el = target.closest(CLICKABLE_SELECTOR)
      if (!el || el.closest(SILENT_SELECTOR)) return
      if (el instanceof HTMLButtonElement && el.disabled) return
      if (el.getAttribute('aria-disabled') === 'true') return
      play('click')
    } catch {
      // Never throw from a listener.
    }
  }
  document.addEventListener('pointerdown', onDown)
  return () => document.removeEventListener('pointerdown', onDown)
}
