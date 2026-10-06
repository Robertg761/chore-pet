import { describe, expect, it } from 'vitest'
import {
  SILENCE,
  centsToRatio,
  envelopeSteps,
  midiToHz,
  parseSoundSetting,
  recipeFor,
  soundDuration,
  type Sound,
} from './synth'

const SOUNDS: Sound[] = ['click', 'sparkle', 'chirp']

describe('midiToHz', () => {
  it('maps A4 to 440 and octaves to doubles', () => {
    expect(midiToHz(69)).toBeCloseTo(440)
    expect(midiToHz(81)).toBeCloseTo(880)
    expect(midiToHz(57)).toBeCloseTo(220)
  })
})

describe('centsToRatio', () => {
  it('is 1 at zero and 2 at an octave', () => {
    expect(centsToRatio(0)).toBe(1)
    expect(centsToRatio(1200)).toBeCloseTo(2)
    expect(centsToRatio(-1200)).toBeCloseTo(0.5)
  })
})

describe('envelopeSteps', () => {
  it('starts and ends silent with the peak in between', () => {
    const [a, b, c] = envelopeSteps({ start: 0.1, duration: 0.2, attack: 0.01, peak: 0.8 })
    expect(a).toEqual({ time: 0.1, gain: SILENCE })
    expect(b.gain).toBe(0.8)
    expect(b.time).toBeCloseTo(0.11)
    expect(c.time).toBeCloseTo(0.3)
    expect(c.gain).toBe(SILENCE)
  })

  it('keeps times increasing and gains positive even for silly inputs', () => {
    const steps = envelopeSteps({ start: 0, duration: 0.01, attack: 5, peak: 0 })
    expect(steps[1].time).toBeGreaterThan(steps[0].time)
    expect(steps[2].time).toBeGreaterThan(steps[1].time)
    for (const s of steps) expect(s.gain).toBeGreaterThan(0)
  })
})

describe('recipes', () => {
  it('have sensible, positive, audible-range voices', () => {
    for (const sound of SOUNDS) {
      const voices = recipeFor(sound)
      expect(voices.length).toBeGreaterThan(0)
      for (const v of voices) {
        expect(v.hz).toBeGreaterThan(80)
        expect(v.hz).toBeLessThan(8000)
        if (v.endHz !== undefined) {
          expect(v.endHz).toBeGreaterThan(80)
          expect(v.endHz).toBeLessThan(8000)
          expect(v.glide).toBeGreaterThan(0)
        }
        expect(v.start).toBeGreaterThanOrEqual(0)
        expect(v.duration).toBeGreaterThan(0)
        expect(v.peak).toBeGreaterThan(0)
        expect(v.peak).toBeLessThanOrEqual(1)
      }
    }
  })

  it('are short: click tiny, chirp about 180 ms, sparkle about 450 ms', () => {
    expect(soundDuration('click')).toBeLessThanOrEqual(0.06)
    expect(soundDuration('chirp')).toBeGreaterThan(0.15)
    expect(soundDuration('chirp')).toBeLessThan(0.25)
    expect(soundDuration('sparkle')).toBeGreaterThan(0.4)
    expect(soundDuration('sparkle')).toBeLessThan(0.55)
  })

  it('click drops in pitch, chirp rises, sparkle climbs', () => {
    const click = recipeFor('click')[0]
    expect(click.endHz!).toBeLessThan(click.hz)
    const chirp = recipeFor('chirp')[0]
    expect(chirp.endHz!).toBeGreaterThan(chirp.hz)
    const starts = [...new Set(recipeFor('sparkle').map((v) => v.start))].filter((s) => s < 0.29)
    const firstHz = starts.map((s) => recipeFor('sparkle').find((v) => v.start === s)!.hz)
    expect([...firstHz].sort((a, b) => a - b)).toEqual(firstHz)
    expect(firstHz.length).toBe(4)
  })
})

describe('parseSoundSetting', () => {
  it('reads on and off and falls back otherwise', () => {
    expect(parseSoundSetting('on', false)).toBe(true)
    expect(parseSoundSetting('off', true)).toBe(false)
    expect(parseSoundSetting(null, true)).toBe(true)
    expect(parseSoundSetting('???', false)).toBe(false)
  })
})
