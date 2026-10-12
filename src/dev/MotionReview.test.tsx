// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { click, input, render } from '../test/react'
import * as motion from '../character/motion'
import { CHARACTER_SLOTS } from '../domain/types'
import { ITEMS } from '../character/items'
import MotionReview from './MotionReview'

let ui: ReturnType<typeof render>
let frames: Map<number, FrameRequestCallback>
let nextFrame: number
let media: MediaQueryList

beforeEach(() => {
  media = Object.assign(new EventTarget(), {
    matches: false,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }) as MediaQueryList
  vi.stubGlobal('matchMedia', () => media)
  frames = new Map()
  nextFrame = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback)
    return nextFrame
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.spyOn(motion, 'sampleMotion')
  ui = render(<MotionReview />)
})

afterEach(() => {
  ui.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function control<T extends HTMLElement>(label: string): T {
  const node = [...ui.container.querySelectorAll('label')].find((el) => el.textContent?.startsWith(label))
    ?.querySelector('input, select')
  expect(node, `Control labeled ${label}`).toBeTruthy()
  return node as T
}

function button(name: string) {
  const node = [...ui.container.querySelectorAll('button')].find((el) => el.textContent === name)
  expect(node, `Button ${name}`).toBeTruthy()
  return node!
}

function select(label: string, value: string) {
  act(() => {
    const el = control<HTMLSelectElement>(label)
    el.value = value
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function frame(now: number) {
  const pending = [...frames.values()]
  frames.clear()
  act(() => pending.forEach((callback) => callback(now)))
}

function currentSample() {
  return vi.mocked(motion.sampleMotion).mock.calls.findLast(([value]) => value.elapsedMs === Number(control<HTMLInputElement>('Time scrubber').value))?.[0]
}

it('starts paused, samples exact scrubbed milliseconds and stays still', () => {
  expect(frames.size).toBe(0)
  input(control('Time scrubber'), '317')
  expect(control<HTMLInputElement>('Elapsed milliseconds').value).toBe('317')
  expect(currentSample()).toMatchObject({ elapsedMs: 317, durationMs: 1200, action: 'greet' })
  frame(5000)
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('317')
})

it('plays from the selected time, pauses without a jump, and resumes without counting paused time', () => {
  input(control('Elapsed milliseconds'), '317')
  click(button('Play'))
  frame(1000)
  frame(1100)
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('417')
  click(button('Pause'))
  expect(frames.size).toBe(0)
  frame(9000)
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('417')
  click(button('Play'))
  frame(10000)
  frame(10025)
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('442')
})

it('scrubbing during playback pauses and restart resets exactly to zero', () => {
  click(button('Play'))
  frame(1000)
  frame(1200)
  input(control('Time scrubber'), '511')
  expect(button('Play')).toBeTruthy()
  expect(frames.size).toBe(0)
  click(button('Restart'))
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('0')
  expect(currentSample()?.elapsedMs).toBe(0)
})

it('clamps action changes and numeric input to the new duration', () => {
  select('Action', 'rest')
  input(control('Elapsed milliseconds'), '2100')
  select('Action', 'turn')
  expect(control<HTMLInputElement>('Time scrubber').max).toBe('360')
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('360')
  expect(ui.container.textContent).toContain('Action duration: 360 ms')
  input(control('Elapsed milliseconds'), '-12')
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('0')
  input(control('Elapsed milliseconds'), '9999')
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('360')
})

it('stops on the exact final frame instead of running beyond the scrubber', () => {
  click(button('Play'))
  frame(10)
  frame(2000)
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('1200')
  expect(button('Play')).toBeTruthy()
  expect(frames.size).toBe(0)
})

it('labels every control and offers each wardrobe slot and its existing items', () => {
  for (const label of ['Species', 'Mood', 'Action', 'Body color', 'Eyes', 'Cheeks', 'Time scrubber', 'Elapsed milliseconds', 'Ground line', 'Ground anchor', 'Contact target', 'Force reduced motion in this panel']) {
    expect(control(label)).toBeTruthy()
  }
  for (const slot of CHARACTER_SLOTS) {
    const el = control<HTMLSelectElement>(`${slot} slot`)
    for (const item of ITEMS.filter((item) => item.slot === slot)) {
      expect([...el.options].some((option) => option.value === item.id)).toBe(true)
    }
  }
  expect([...control<HTMLSelectElement>('Body color').options].some((option) => option.textContent?.includes('Dark'))).toBe(true)
  expect(control<HTMLInputElement>('Time scrubber').step).toBe('1')
})

it('passes selected species, mood, action, and reduced motion to the production sampler', () => {
  select('Species', 'bun')
  select('Mood', 'sick')
  select('Action', 'walk')
  click(control('Force reduced motion in this panel'))
  input(control('Time scrubber'), '321')
  expect(currentSample()).toMatchObject({ species: 'bun', mood: 'sick', action: 'walk', elapsedMs: 321, reducedMotion: true })
  expect(currentSample()!.distance).toBeGreaterThan(0)
})

it('labels the local override separately from authoritative live system reduced motion', () => {
  ui.unmount()
  Object.defineProperty(media, 'matches', { configurable: true, value: true })
  ui = render(<MotionReview />)
  select('Action', 'celebrate')
  input(control('Time scrubber'), '756')
  const override = control<HTMLInputElement>('Force reduced motion in this panel')
  const body = () => ui.container.querySelector('[data-character-body]')!.getAttribute('transform')
  const still = body()
  expect(override.checked).toBe(false)
  expect(currentSample()?.reducedMotion).toBe(true)
  expect(ui.container.textContent).toContain('System reduced motion is active.')

  const systemPreference = (matches: boolean) => act(() => {
    Object.defineProperty(media, 'matches', { configurable: true, value: matches })
    media.dispatchEvent(Object.assign(new Event('change'), { matches, media: media.media }))
  })
  systemPreference(false)
  expect(override.checked).toBe(false)
  expect(currentSample()?.reducedMotion).toBe(false)
  expect(body()).not.toBe(still)
  expect(ui.container.textContent).not.toContain('System reduced motion is active.')

  click(override)
  expect(body()).toBe(still)
  systemPreference(true)
  click(override)
  expect(override.checked).toBe(false)
  expect(body()).toBe(still)
  systemPreference(false)
  expect(body()).not.toBe(still)
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('756')
  expect(frames.size).toBe(0)
})

it('renders actual 200px, 60px, and 25px previews plus selectable key frames', () => {
  for (const size of [200, 60, 25]) {
    expect(ui.container.querySelector(`svg[width="${size}"][height="${size}"]`)).toBeTruthy()
  }
  const keys = ui.container.querySelectorAll('.motion-review-keyframes button')
  expect(keys.length).toBeGreaterThanOrEqual(4)
  click(keys[1])
  expect(Number(control<HTMLInputElement>('Time scrubber').value)).toBeGreaterThan(0)
  expect(frames.size).toBe(0)
})

it('keeps overlays optional and does not invent a furniture contact target or write saved pet data', () => {
  const write = vi.spyOn(Storage.prototype, 'setItem')
  expect(ui.container.querySelector('[data-review-overlay]')).toBeNull()
  expect(control<HTMLInputElement>('Contact target').disabled).toBe(true)
  expect(ui.container.textContent).toContain('No furniture contact target')
  click(control('Ground line'))
  click(control('Ground anchor'))
  expect(ui.container.querySelector('[data-review-overlay="ground"]')).toBeTruthy()
  expect(ui.container.querySelector('[data-review-overlay="anchor"]')).toBeTruthy()
  select('Species', 'sprout')
  select('head slot', 'crown')
  select('Body color', 'dark')
  input(control('Time scrubber'), '315')
  expect(write).not.toHaveBeenCalled()
})

it('mirrors all review art and samples the selected facing', () => {
  select('Facing', 'left')
  select('Action', 'walk')
  input(control('Elapsed milliseconds'), '211')
  expect(currentSample()?.facing).toBe(-1)
  const mirrored = ui.container.querySelectorAll('[data-review-facing="-1"]')
  expect(mirrored).toHaveLength(8)
  for (const node of mirrored) expect(node.getAttribute('transform')).toBe('translate(200 0) scale(-1 1)')
  select('Facing', 'right')
  expect(currentSample()?.facing).toBe(1)
  expect(ui.container.querySelector('[data-review-facing="-1"]')).toBeNull()
})

it('steps by 16 milliseconds, clamps endpoints and pauses an active clock', () => {
  click(button('Back 16 ms'))
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('0')
  input(control('Elapsed milliseconds'), '317')
  click(button('Play'))
  frame(1000)
  frame(1010)
  click(button('Forward 16 ms'))
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('343')
  expect(frames.size).toBe(0)
  click(button('Back 16 ms'))
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('327')
  input(control('Elapsed milliseconds'), '1199')
  click(button('Forward 16 ms'))
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('1200')
})

it('loops with overshoot retained and returns to one-shot playback when disabled', () => {
  click(control('Loop playback'))
  input(control('Elapsed milliseconds'), '1190')
  click(button('Play'))
  frame(1000)
  frame(1030)
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('20')
  expect(frames.size).toBe(1)
  frame(3535)
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('125')
  expect(frames.size).toBe(1)
  click(control('Loop playback'))
  frame(5000)
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('1200')
  expect(button('Play')).toBeTruthy()
  expect(frames.size).toBe(0)
})

it('studies a complete idle blink pattern without changing the production breath duration', () => {
  select('Action', 'idle')
  expect(control<HTMLInputElement>('Time scrubber').max).toBe('12000')
  input(control('Elapsed milliseconds'), '9270')
  expect(currentSample()).toMatchObject({ action: 'idle', elapsedMs: 9270, durationMs: 4000, distance: 0 })
  expect(ui.container.textContent).toContain('three 4-second breathing cycles')
  expect(frames.size).toBe(0)
  select('Action', 'turn')
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('360')
  expect(control<HTMLInputElement>('Time scrubber').max).toBe('360')
})

it.each([
  { species: 'bun', primary: 9070, gap: 9170, second: 9270 },
  { species: 'mochi', primary: 7370, gap: 7470, second: 7570 },
  { species: 'sprout', primary: 5770, gap: 5870, second: 5970 },
])('renders $species paired blink comparison frames at exact species-specific times', ({ species, primary, gap, second }) => {
  select('Species', species)
  select('Action', 'idle')
  for (const [label, time, openness] of [['Primary blink', primary, 0.1], ['Between blinks', gap, 1], ['Second blink', second, 0.1]] as const) {
    const key = ui.container.querySelector<HTMLButtonElement>(`[aria-label="${label}, ${time} milliseconds"]`)
    expect(Boolean(key)).toBe(true)
    click(key!)
    expect(control<HTMLInputElement>('Time scrubber').value).toBe(String(time))
    const eyes = ui.container.querySelectorAll('.motion-review-previews [data-eye-open]')
    expect(eyes).toHaveLength(6)
    for (const eye of eyes) expect(Number(eye.getAttribute('data-eye-open'))).toBeCloseTo(openness)
    expect(frames.size).toBe(0)
  }
  click(control('Force reduced motion in this panel'))
  for (const eye of ui.container.querySelectorAll('.motion-review-previews [data-eye-open]')) {
    expect(Number(eye.getAttribute('data-eye-open'))).toBe(1)
  }
})

it('finishes and loops the idle review at twelve seconds with one clock', () => {
  select('Action', 'idle')
  input(control('Elapsed milliseconds'), '11990')
  click(button('Play'))
  frame(1000); frame(1030)
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('12000')
  expect(frames.size).toBe(0)
  click(control('Loop playback'))
  click(button('Play'))
  frame(2000); frame(14025)
  expect(control<HTMLInputElement>('Time scrubber').value).toBe('25')
  expect(frames.size).toBe(1)
  click(button('Pause'))
  expect(frames.size).toBe(0)
})
