// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Resvg } from '@resvg/resvg-js'
import { render } from '../test/react'
import { PALETTE } from '../art/palette'
import type { Species } from '../domain/types'
import { AnimatedCharacterArt } from './AnimatedCharacter'
import { Character, CharacterArt } from './Character'
import { ACTION_MS, blendGroundFeet, sampleMotion, type MotionFrame } from './motion'
import { articulatedPose } from './species/animatedBody'
import { poseFor } from './poses'
import { ITEMS } from './items'

const speciesList: Species[] = ['bun', 'mochi', 'sprout']
const outfit = { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' }
const neutral = sampleMotion({ species: 'bun', mood: 'happy', action: 'idle', elapsedMs: 0, distance: 0, durationMs: 4000, reducedMotion: false })
const moving: MotionFrame = { ...neutral, bodyX: 3, bodyY: -3, scaleX: 1.08, scaleY: 0.93, lean: 8, leftFoot: 6, leftArm: 24, rightArm: -36, leftAppendage: 9, rightAppendage: -7, gazeX: 4, gazeY: -2, shadowScale: 0.8, shadowOpacity: 0.7 }
const cleanups: (() => void)[] = []
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()))
function mount(content: Parameters<typeof render>[0]) {
  const ui = render(content)
  cleanups.push(ui.unmount)
  return ui
}
function art(species: Species, frame = neutral) {
  return <svg><AnimatedCharacterArt species={species} mood="happy" bodyColour={PALETTE.petDefault} equipped={outfit} frame={frame} /></svg>
}

// Evaluate SVG transforms independently to check the actual rendered contact point.
function worldPoint(node: Element, x: number, y: number): [number, number] {
  for (let el: Element | null = node; el; el = el.parentElement) {
    const transforms = [...(el.getAttribute('transform') ?? '').matchAll(/(matrix|translate|scale|rotate)\(([^)]+)\)/g)].reverse()
    for (const [, op, args] of transforms) {
      const v = args.split(/[ ,]+/).map(Number)
      if (op === 'translate') { x += v[0]; y += v[1] ?? 0 }
      if (op === 'scale') { x *= v[0]; y *= v[1] ?? v[0] }
      if (op === 'matrix') { [x, y] = [v[0] * x + v[2] * y + v[4], v[1] * x + v[3] * y + v[5]] }
      if (op === 'rotate') {
        const a = v[0] * Math.PI / 180, cx = v[1] ?? 0, cy = v[2] ?? 0
        ;[x, y] = [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]
      }
    }
  }
  return [x, y]
}

describe('AnimatedCharacterArt', () => {
  for (const species of speciesList) {
    for (const expression of ['mood', 'pleased', 'alert'] as const) {
      it(`${species} renders ${expression} with the complete attached wardrobe`, () => {
        const { container } = mount(art(species, { ...moving, expression }))
        const slots = [...container.querySelectorAll('[data-slot]')].map((el) => el.getAttribute('data-slot'))
        expect(slots).toEqual(['back', 'body', 'outfit', 'neck', 'face', 'head'])
        expect(container.querySelector('[data-slot-front="back"]')).not.toBeNull()
        const body = container.querySelector('[data-character-body]')!
        for (const slot of container.querySelectorAll('[data-slot]')) expect(body.contains(slot)).toBe(true)
        expect(body.querySelector('clipPath path')?.getAttribute('d')).toBe(poseFor(species, 'idle').silhouette.d)
        expect(container.innerHTML).not.toMatch(/NaN|Infinity|undefined/)
        expect(container.querySelector('.ch-breathe')).toBeNull()
        expect(container.querySelector('.ch-animated')).not.toBeNull()
      })
    }

    it(`${species} compensates torso lift, lean and squash to keep the contact foot planted`, () => {
      const { container, rerender } = mount(art(species, moving))
      const contact = container.querySelector('[data-foot="right"] ellipse')!
      const raised = container.querySelector('[data-foot="left"] ellipse')!
      expect(worldPoint(contact, Number(contact.getAttribute('cx')), Number(contact.getAttribute('cy')) + 9)[1]).toBeCloseTo(187, 7)
      expect(worldPoint(raised, Number(raised.getAttribute('cx')), Number(raised.getAttribute('cy')) + 9)[1]).toBeCloseTo(181, 7)
      const ground = container.querySelector('[data-character-ground]')!
      expect(ground.closest('[data-character-body]')).toBeNull()
      expect(ground.querySelector('ellipse')?.getAttribute('cy')).toBe('186')
      expect(ground.getAttribute('opacity')).toBe('0.7')
      rerender(art(species, { ...moving, bodyY: -20, leftFoot: 0, rightFoot: 0 }))
      const jumping = container.querySelector('[data-foot="right"] ellipse')!
      expect(worldPoint(jumping, Number(jumping.getAttribute('cx')), Number(jumping.getAttribute('cy')) + 9)[1]).toBeCloseTo(167, 7)
    })

    for (const pose of ['sleeping', 'sick'] as const) {
      it(`${species} preserves ${pose} geometry and hidden slots during a pleased jump`, () => {
        const { container, rerender } = mount(<svg><AnimatedCharacterArt species={species} mood={pose === 'sick' ? 'sick' : 'happy'} pose={pose} bodyColour={PALETTE.petDefault} equipped={outfit} frame={neutral} /></svg>)
        const before = container.innerHTML
        rerender(<svg><AnimatedCharacterArt species={species} mood={pose === 'sick' ? 'sick' : 'happy'} pose={pose} bodyColour={PALETTE.petDefault} equipped={outfit} frame={{ ...moving, bodyY: -24, expression: 'pleased' }} /></svg>)
        expect(container.innerHTML).toBe(before)
        expect(container.querySelectorAll('ellipse[cy="186"]')).toHaveLength(1)
        const hidden = poseFor(species, pose).hides ?? []
        for (const slot of ['back', 'outfit', 'neck', 'face', 'head'] as const) expect(!!container.querySelector(`[data-slot="${slot}"]`)).toBe(!hidden.includes(slot))
      })
    }

    it(`${species} keeps scruffy brows, smudges and posture through pleased reactions`, () => {
      const { container } = mount(<svg><AnimatedCharacterArt species={species} mood="scruffy" bodyColour={PALETTE.petDefault} frame={{ ...moving, expression: 'pleased' }} /></svg>)
      expect(container.querySelector('[data-expression="scruffy"]')).not.toBeNull()
      expect(container.querySelectorAll('[opacity="0.55"] ellipse')).toHaveLength(3)
      expect(container.querySelector('[data-character-body]')?.getAttribute('transform')).not.toBe(container.querySelector('[data-character-ground]')?.getAttribute('transform'))
    })
  }

  it('moves only eye ink for gaze, leaving the mouth, face anchor and glasses fixed', () => {
    const { container, rerender } = mount(art('bun'))
    const mouth = container.querySelector('[data-expression]')!.lastElementChild!.outerHTML
    const glasses = container.querySelector('[data-slot="face"]')!.outerHTML
    rerender(art('bun', { ...neutral, gazeX: 4, gazeY: 2 }))
    expect(container.querySelector('[data-expression]')!.lastElementChild!.outerHTML).toBe(mouth)
    expect(container.querySelector('[data-slot="face"]')!.outerHTML).toBe(glasses)
    expect(container.querySelector('[data-eye-gaze]')?.getAttribute('transform')).toBe('translate(3 2)')
    expect(container.querySelector('[data-expression]')!.getAttribute('transform')).toBeNull()
  })

  it('gives every rendered clip a unique stable ID, including bandanas', () => {
    const pair = <svg>{[0, 1].map((key) => <AnimatedCharacterArt key={key} species="bun" mood="happy" bodyColour={PALETTE.white} equipped={{ ...outfit, neck: 'bandana' }} frame={moving} />)}<CharacterArt species="bun" mood="happy" bodyColour={PALETTE.white} equipped={{ ...outfit, neck: 'bandana' }} /></svg>
    const { container, rerender } = mount(pair)
    const ids = [...container.querySelectorAll('[id]')].map((el) => el.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const el of container.querySelectorAll('[clip-path]')) expect(ids).toContain(el.getAttribute('clip-path')!.slice(5, -1))
    rerender(pair)
    expect([...container.querySelectorAll('[id]')].map((el) => el.id)).toEqual(ids)
  })

  it('honors an explicit upright pose while keeping unwell pose overrides gentle', () => {
    const { container, rerender } = mount(<svg><AnimatedCharacterArt species="bun" mood="happy" pose="meh" bodyColour={PALETTE.white} frame={neutral} /></svg>)
    expect(container.querySelector('[data-expression="meh"]')).not.toBeNull()
    rerender(<svg><AnimatedCharacterArt species="bun" mood="scruffy" pose="cheering" bodyColour={PALETTE.white} frame={{ ...moving, expression: 'pleased' }} /></svg>)
    expect(container.querySelector('[data-character-pose]')?.getAttribute('data-character-pose')).toBe('scruffy')
    expect(container.querySelector('[data-expression="scruffy"]')).not.toBeNull()
  })

  it('keeps the rendered body and outfit clip in exactly the same space across mood postures', () => {
    // Local attachment coordinates are independent fixtures from the existing art.
    // Both the origin and an offset must follow the torso, including item scale.
    const anchors = {
      bun: { back: [100, 140, 1], outfit: [100, 162, 1], neck: [100, 157, 1], face: [100, 126, 1], head: [100, 92, 0.95] },
      mochi: { back: [100, 132, 1], outfit: [100, 160, 1.1], neck: [100, 152, 1], face: [100, 124, 1], head: [100, 78, 1] },
      sprout: { back: [100, 138, 1], outfit: [100, 162, 1], neck: [100, 156, 1], face: [100, 126, 1], head: [100, 76, 0.95] },
    }
    for (const species of speciesList) for (const mood of ['happy', 'content', 'meh', 'scruffy'] as const) {
      const { container } = mount(<svg><AnimatedCharacterArt species={species} mood={mood} bodyColour={PALETTE.petDefault} equipped={outfit} frame={moving} /></svg>)
      const body = container.querySelector('[data-slot="body"] clipPath path')!
      const clip = container.querySelector('[data-slot="outfit"] clipPath path')!
      expect(clip.getAttribute('d')).toBe(body.getAttribute('d'))
      expect(worldPoint(clip, 100, 120)).toEqual(worldPoint(body, 100, 120))
      for (const slot of ['back', 'outfit', 'neck', 'face', 'head'] as const) {
        const [x, baseY, scale] = anchors[species][slot]
        const y = slot === 'face' && species === 'bun' ? { happy: 126, content: 127, meh: 130, scruffy: 133 }[mood]
          : slot === 'head' && species === 'bun' ? { happy: 92, content: 93, meh: 95, scruffy: 96 }[mood]
          : slot === 'face' && species === 'mochi' && mood === 'scruffy' ? 128 : baseY
        const layer = container.querySelector(`[data-slot="${slot}"]`)!
        const placed = slot === 'outfit' ? layer.querySelector('g[clip-path]')!.firstElementChild! : layer.firstElementChild!
        for (const [dx, dy] of [[0, 0], [12, -8]]) {
          const expected = worldPoint(body, x + dx * scale, y + dy * scale)
          const actual = worldPoint(placed, dx, dy)
          expect(actual[0]).toBeCloseTo(expected[0], 7)
          expect(actual[1]).toBeCloseTo(expected[1], 7)
          if (slot === 'back') {
            const front = container.querySelector('[data-slot-front="back"]')!.firstElementChild!
            expect(worldPoint(front, dx, dy)[0]).toBeCloseTo(expected[0], 7)
            expect(worldPoint(front, dx, dy)[1]).toBeCloseTo(expected[1], 7)
          }
        }
      }
    }
  })

  it('keeps a sick pet in its bed when an upright pose is requested', () => {
    for (const species of speciesList) {
      const { container } = mount(<svg><AnimatedCharacterArt species={species} mood="sick" pose="cheering" bodyColour={PALETTE.petDefault} equipped={outfit} frame={{ ...moving, expression: 'pleased' }} /></svg>)
      expect(container.querySelector('[data-character-pose]')?.getAttribute('data-character-pose')).toBe('sick')
      expect(container.querySelector('[data-expression="sick"]')).not.toBeNull()
      expect(container.querySelector('[data-character-body]')?.getAttribute('transform')).toBeNull()
      for (const slot of ['back', 'outfit', 'neck']) expect(container.querySelector(`[data-slot="${slot}"]`)).toBeNull()
      expect(container.querySelector('[data-slot-front="back"]')).toBeNull()
      expect(container.querySelectorAll('rect').length).toBeGreaterThan(0)
    }
  })

  it('allows only a small eyelid stir in resting poses on notice', () => {
    for (const pose of ['sleeping', 'sick'] as const) {
      const scene = (frame: MotionFrame) => <svg><AnimatedCharacterArt species="bun" mood={pose === 'sick' ? 'sick' : 'happy'} pose={pose} bodyColour={PALETTE.white} frame={frame} /></svg>
      const { container, rerender } = mount(scene(neutral))
      const before = [...container.querySelectorAll('path')].map((el) => el.getAttribute('d'))
      const bed = [...container.querySelectorAll('rect')].map((el) => el.outerHTML)
      rerender(scene({ ...moving, expression: 'alert' }))
      expect([...container.querySelectorAll('path')].map((el) => el.getAttribute('d'))).not.toEqual(before)
      expect([...container.querySelectorAll('rect')].map((el) => el.outerHTML)).toEqual(bed)
      expect(container.querySelector('[data-character-body]')?.getAttribute('transform')).toBeNull()
    }
  })

  it('renders sampled sick notice as a closed-eye stir with the rest of the bed scene fixed', () => {
    for (const species of speciesList) {
      const frame = (elapsedMs: number, reducedMotion = false) => sampleMotion({ species, mood: 'sick', action: 'notice', elapsedMs, durationMs: ACTION_MS.notice, distance: 0, blinkMs: 0, reducedMotion })
      const scene = (motion: MotionFrame) => <svg xmlns="http://www.w3.org/2000/svg" width={200} height={200} viewBox="0 0 200 200"><AnimatedCharacterArt species={species} mood="sick" bodyColour={PALETTE.petDefault} equipped={outfit} frame={motion} /></svg>
      const withoutEyes = (container: Element) => {
        const copy = container.cloneNode(true) as Element
        for (const eye of copy.querySelectorAll('[data-expression="sick"] > g')) eye.remove()
        return copy.innerHTML
      }
      const eyePaths = (container: Element) => [...container.querySelectorAll('[data-expression="sick"] > g > path')].map((path) => path.getAttribute('d'))
      const { container, rerender } = mount(scene(frame(0)))
      const before = container.innerHTML, fixed = withoutEyes(container), closed = eyePaths(container)
      expect(closed).toHaveLength(4) // Two closed chevrons and their worried brows.
      const beforePixels = new Resvg(renderToStaticMarkup(scene(frame(0)))).render().pixels
      const active = frame(ACTION_MS.notice * 0.42)
      rerender(scene(active))
      expect(eyePaths(container)).not.toEqual(closed)
      expect(withoutEyes(container)).toBe(fixed)
      expect(container.querySelector('[data-character-pose]')?.getAttribute('data-character-pose')).toBe('sick')
      expect(container.querySelector('[data-expression]')?.getAttribute('data-expression')).toBe('sick')
      expect(container.querySelector('[data-eye-open], .ch-eye, [data-expression="cheering"]')).toBeNull()
      for (const slot of poseFor(species, 'sick').hides ?? []) expect(container.querySelector(`[data-slot="${slot}"]`)).toBeNull()
      const afterPixels = new Resvg(renderToStaticMarkup(scene(active))).render().pixels
      expect(afterPixels.some((value, index) => value !== beforePixels[index])).toBe(true)
      for (const elapsed of [ACTION_MS.notice * 0.42, ACTION_MS.notice * 0.7]) {
        rerender(scene(frame(elapsed, true)))
        expect(container.innerHTML).toBe(before)
      }
      rerender(scene(frame(ACTION_MS.notice)))
      expect(container.innerHTML).toBe(before)
      rerender(scene({ ...active, expression: 'pleased', eyeOpen: 0 }))
      expect(container.innerHTML).toBe(before)
    }
  })

  it('blinks every open eye style around its center while leaving glasses and mouth fixed', () => {
    for (const species of speciesList) for (const eyes of ['classic', 'button', 'sparkly', 'lashes'] as const) {
      const scene = (eyeOpen?: number) => <svg><AnimatedCharacterArt species={species} mood="happy" bodyColour={PALETTE.petDefault} equipped={outfit} look={{ eyes }} frame={{ ...neutral, eyeOpen }} /></svg>
      const { container, rerender } = mount(scene())
      const glasses = container.querySelector('[data-slot="face"]')!.outerHTML
      const mouth = container.querySelector('[data-expression]')!.lastElementChild!.outerHTML
      rerender(scene(0.25))
      const blinks = container.querySelectorAll('[data-eye-open]')
      expect(blinks).toHaveLength(2)
      const y = species === 'mochi' ? 124 : 126
      for (const [i, blink] of [...blinks].entries()) {
        const x = i === 0 ? 80 : 120
        expect(worldPoint(blink, x, y)[0]).toBeCloseTo(x, 7)
        expect(worldPoint(blink, x, y)[1]).toBeCloseTo(y, 7)
        expect(worldPoint(blink, x, y + 10)[1]).toBeCloseTo(y + 2.5, 7)
        if (eyes === 'lashes') expect(blink.querySelector('path[stroke-width="3"]')).not.toBeNull()
      }
      expect(container.querySelector('[data-slot="face"]')!.outerHTML).toBe(glasses)
      expect(container.querySelector('[data-expression]')!.lastElementChild!.outerHTML).toBe(mouth)
      rerender(scene())
      expect([...container.querySelectorAll('[data-eye-open]')].every((el) => el.getAttribute('data-eye-open') === '1')).toBe(true)
    }
  })

  it('leaves sleeping, sick and pleased closed-eye art unchanged by blink input', () => {
    for (const species of speciesList) for (const pose of ['sleeping', 'sick', 'idle'] as const) {
      const scene = (eyeOpen: number) => <svg><AnimatedCharacterArt species={species} mood={pose === 'sick' ? 'sick' : 'happy'} pose={pose} bodyColour={PALETTE.petDefault} frame={{ ...neutral, expression: 'pleased', eyeOpen }} /></svg>
      const { container, rerender } = mount(scene(1))
      const before = container.innerHTML
      rerender(scene(0))
      expect(container.innerHTML).toBe(before)
      expect(container.querySelector('[data-eye-open]')).toBeNull()
    }
  })

  it('renders a sampled lifetime blink on tired eyes and opens them under reduced motion', () => {
    for (const [species, blinkMs] of [['bun', 3070], ['mochi', 1370], ['sprout', 5770]] as const) {
      const scene = (reducedMotion: boolean) => <svg><AnimatedCharacterArt species={species} mood="scruffy" bodyColour={PALETTE.petDefault} frame={sampleMotion({ species, mood: 'scruffy', action: 'idle', elapsedMs: 400, blinkMs, distance: 0, durationMs: 4000, reducedMotion })} /></svg>
      const { container, rerender } = mount(scene(false))
      expect(container.querySelector('[data-expression="scruffy"]')).not.toBeNull()
      for (const eye of container.querySelectorAll('[data-eye-open]')) expect(Number(eye.getAttribute('data-eye-open'))).toBeCloseTo(0.1)
      const face = container.querySelector('[data-expression]')!
      const brows = [...face.querySelectorAll('path[stroke-width="3"]')].map((el) => el.outerHTML)
      expect(brows).toHaveLength(2)
      rerender(scene(true))
      for (const eye of container.querySelectorAll('[data-eye-open]')) expect(eye.getAttribute('data-eye-open')).toBe('1')
      expect([...container.querySelectorAll('[data-expression] path[stroke-width="3"]')].map((el) => el.outerHTML)).toEqual(brows)
    }
  })

  it('uses explicit species appendage pivots', () => {
    const { container } = mount(<svg>{speciesList.map((species) => <AnimatedCharacterArt key={species} species={species} mood="happy" bodyColour={PALETTE.white} frame={moving} />)}</svg>)
    for (const pivot of ['82 98', '118 98', '100 76', '100 74', '101 46']) expect(container.querySelector(`[data-pivot="${pivot}"]`)).not.toBeNull()
  })

  it('keeps the standalone static API and share serialization independent of frames', () => {
    const svg = renderToStaticMarkup(<Character species="mochi" mood="sick" bodyColour={PALETTE.sakura} size={60} title="Sleepy pet" equipped={outfit} />)
    expect(svg).toContain('width="60"')
    expect(svg).toContain('aria-label="Sleepy pet"')
    expect(svg).toContain('ch-breathe')
    expect(svg).not.toContain('ch-animated')
    expect(svg).not.toContain('data-slot="outfit"')
    for (const species of speciesList) {
      const healthy = renderToStaticMarkup(<Character species={species} mood="happy" bodyColour={PALETTE.petDefault} />)
      expect(healthy).toContain('ch-eye')
      expect(healthy).not.toContain('data-eye-open')
    }
  })

  it('renders the public articulated pose with the existing item registry', () => {
    const p = articulatedPose('sprout', moving)
    expect(p.silhouette.d).toBe(poseFor('sprout', 'idle').silhouette.d)
    expect(Object.keys(p.anchors).sort()).toEqual(['back', 'body', 'face', 'head', 'neck', 'outfit'])
    expect(ITEMS.every((item) => !!p.anchors[item.slot])).toBe(true)
  })

  it('keeps malformed numeric frames finite in SVG attributes', () => {
    const invalid = Object.fromEntries(Object.entries(neutral).map(([key, value]) => [key, typeof value === 'number' ? NaN : value])) as unknown as MotionFrame
    const { container } = mount(art('sprout', { ...invalid, scaleX: Infinity, scaleY: -Infinity }))
    expect(container.innerHTML).not.toMatch(/NaN|Infinity|undefined/)
    expect(container.querySelectorAll('[data-foot]')).toHaveLength(2)
    for (const eye of container.querySelectorAll('[data-eye-open]')) expect(eye.getAttribute('data-eye-open')).toBe('1')
  })

  it('separates a waving paw from the torso silhouette at room scale', () => {
    for (const species of speciesList) {
      const { container } = mount(art(species, { ...neutral, rightArm: -54 }))
      const paw = container.querySelector('[data-arm="right"] ellipse')!
      const [x, y] = worldPoint(paw, Number(paw.getAttribute('cx')), Number(paw.getAttribute('cy')))
      // Paw centre has at least 7 SVG units of separation from the widest torso edge.
      expect(x).toBeGreaterThan(species === 'mochi' ? 175 : 163)
      expect(y).toBeLessThan(140)
    }
  })

  it('keeps Bun ear tips inside the SVG during the highest hop', () => {
    for (const elapsedMs of [800, 924, 1100]) {
      const frame = sampleMotion({ species: 'bun', mood: 'happy', action: 'celebrate-big', elapsedMs, distance: 0, durationMs: ACTION_MS['celebrate-big'], reducedMotion: false })
      const { container } = mount(art('bun', frame))
      const left = container.querySelector('[data-appendage="left-ear"] path')!
      const right = container.querySelector('[data-appendage="right-ear"] path')!
      expect(worldPoint(left, 72, 26)[1]).toBeGreaterThan(4)
      expect(worldPoint(right, 72, 26)[1]).toBeGreaterThan(4)
    }
  })

  it('samples reaction accents and suppresses them in resting poses', () => {
    const { container, rerender } = mount(art('mochi', { ...neutral, accentOpacity: 0.6 }))
    const accents = container.querySelector('[data-character-accents]')!
    expect(accents?.getAttribute('opacity')).toBe('0.6')
    expect(accents?.getAttribute('pointer-events')).toBe('none')
    expect(accents?.querySelectorAll('path')).toHaveLength(2)
    rerender(<svg><AnimatedCharacterArt species="mochi" mood="sick" bodyColour={PALETTE.sakura} frame={{ ...moving, accentOpacity: 1 }} /></svg>)
    expect(container.querySelector('[data-character-accents]')?.getAttribute('opacity')).toBe('0')
  })

  it('plants a stance foot in projected world space across both route axes, corners and facings', () => {
    for (const [species, stride] of [['bun', 0.72], ['mochi', 0.9], ['sprout', 0.82]] as const) {
      for (const [dx, dy] of [[64, 32], [-64, 32], [-64, -32], [64, -32]]) for (const facing of [1, -1] as const) {
        // Each species' stance spans this fractional corner and retains its landing.
        const corner = 0.8
        const groundPath = [{ distance: 0, x: 0, y: 0 }, { distance: corner, x: dx * corner, y: dy * corner }, { distance: 3, x: dx * (2 * corner - 3), y: dy * 3 }]
        const contacts = [0.8, 0.95, 1.1, 1.2].map((phase) => {
          const distance = stride * phase
          const position = { x: dx * (distance < corner ? distance : 2 * corner - distance), y: dy * distance }
          const frame = sampleMotion({ species, mood: 'happy', action: 'walk', elapsedMs: 400, distance, durationMs: 2000, reducedMotion: false, groundPath, facing })
          expect(frame.rightFoot).toBe(0)
          const { container } = mount(<svg><g transform={`translate(${position.x * 0.125} ${position.y * 0.125}) scale(0.125)`}><g transform={facing === -1 ? 'translate(200 0) scale(-1 1)' : undefined}><AnimatedCharacterArt species={species} mood="happy" bodyColour={PALETTE.petDefault} frame={frame} /></g></g></svg>)
          const foot = container.querySelector('[data-foot="right"] ellipse')!
          return worldPoint(foot, Number(foot.getAttribute('cx')), Number(foot.getAttribute('cy')) + 9)
        })
        for (const contact of contacts) {
          expect(contact[0]).toBeCloseTo(contacts[0][0], 7)
          expect(contact[1]).toBeCloseTo(contacts[0][1], 7)
        }
      }
    }
  })

  it('keeps rendered route contacts grounded through departure, corners and partial-stride arrival', () => {
    const { container, rerender } = mount(<svg />)
    for (const species of speciesList) for (const facing of [1, -1] as const) {
      for (const [dx, dy] of [[64, 32], [-64, 32], [-64, -32], [64, -32]]) {
        const end = 1.13, corner = 0.31
        const groundPath = [{ distance: 0, x: 0, y: 0 }, { distance: corner, x: dx * corner, y: dy * corner }, { distance: end, x: dx * (2 * corner - end), y: dy * end }]
        const previous: Partial<Record<'left' | 'right', [number, number]>> = {}
        for (let i = 0; i <= 40; i++) {
          const distance = end * i / 40
          const position = { x: dx * (distance <= corner ? distance : 2 * corner - distance), y: dy * distance }
          const frame = sampleMotion({ species, mood: 'happy', action: 'walk', elapsedMs: 1600 * i / 40, durationMs: 1600, distance, groundPath, facing, reducedMotion: false, blinkMs: 0 })
          const between = sampleMotion({ species, mood: 'happy', action: 'walk', elapsedMs: 1600 * (i - 0.5) / 40, durationMs: 1600, distance: end * (i - 0.5) / 40, groundPath, facing, reducedMotion: false, blinkMs: 0 })
          rerender(<svg><g transform={`translate(${position.x * 0.125} ${position.y * 0.125}) scale(0.125)`}><g transform={facing === -1 ? 'translate(200 0) scale(-1 1)' : undefined}><AnimatedCharacterArt species={species} mood="happy" bodyColour={PALETTE.petDefault} frame={frame} /></g></g></svg>)
          for (const side of ['left', 'right'] as const) {
            const foot = container.querySelector(`[data-foot="${side}"] ellipse`)!
            const point = worldPoint(foot, Number(foot.getAttribute('cx')), Number(foot.getAttribute('cy')) + 9)
            expect(point[1], `${species}/${side}/${distance} ground height`).toBeCloseTo((position.y + 187 + frame[`${side}GroundY`]! - frame[`${side}Foot`]) * 0.125, 7)
            if (frame[`${side}Foot`] === 0) {
              if (previous[side] && between[`${side}Foot`] === 0) {
                expect(point[0], `${species}/${side}/${distance} stance X`).toBeCloseTo(previous[side]![0], 7)
                expect(point[1], `${species}/${side}/${distance} stance Y`).toBeCloseTo(previous[side]![1], 7)
              }
              previous[side] = point
            } else delete previous[side]
          }
        }
      }
    }
  })

  it('preserves a frozen contact after mirror/rebase and lifts it through a blended interruption', () => {
    const { container, rerender } = mount(<svg />)
    for (const species of speciesList) {
      const old = sampleMotion({ species, mood: 'happy', action: 'walk', elapsedMs: 400, durationMs: 2000, distance: 0.1, groundPath: [{ distance: 0, x: 0, y: 0 }, { distance: 3, x: 192, y: 96 }], reducedMotion: false })
      const scene = (frame: MotionFrame, x: number, y: number, facing: 1 | -1) => <svg><g transform={`translate(${x} ${y}) scale(0.125)`}><g transform={facing === -1 ? 'translate(200 0) scale(-1 1)' : undefined}><AnimatedCharacterArt species={species} mood="happy" bodyColour={PALETTE.petDefault} frame={frame} /></g></g></svg>
      const point = (side: string) => {
        const foot = container.querySelector(`[data-foot="${side}"] ellipse`)!
        return worldPoint(foot, Number(foot.getAttribute('cx')), Number(foot.getAttribute('cy')) + 9)
      }
      rerender(scene(old, 2, 1, 1))
      const frozen = point('right')
      const rebased = { ...old, bodyX: -old.bodyX, leftFoot: old.rightFoot, rightFoot: old.leftFoot,
        leftGroundX: -old.rightGroundX! + 16, rightGroundX: -old.leftGroundX! + 16,
        leftGroundY: old.rightGroundY! - 8, rightGroundY: old.leftGroundY! - 8 }
      for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
        const frame = { ...neutral, bodyX: rebased.bodyX * (1 - progress), ...blendGroundFeet(rebased, neutral, progress) }
        rerender(scene(frame, 4, 2, -1))
        const contact = point('left')
        if (progress === 0) {
          expect(contact[0]).toBeCloseTo(frozen[0], 7)
          expect(contact[1]).toBeCloseTo(frozen[1], 7)
        } else if (progress < 1) expect(frame.leftFoot).toBeGreaterThan(0)
        else {
          rerender(scene(neutral, 4, 2, -1))
          expect(contact).toEqual(point('left'))
        }
      }
    }
  })

  it('renders readable eye and mouth ink over dark body fills in static and sampled expressions', () => {
    for (const species of speciesList) for (const bodyColour of [PALETTE.ink, '#302838']) {
      for (const state of ['static', 'pleased', 'blink', 'sleeping', 'scruffy'] as const) {
        const mood = state === 'scruffy' ? 'scruffy' : 'happy'
        const content = state === 'static' ? <CharacterArt species={species} mood={mood} bodyColour={bodyColour} /> : <AnimatedCharacterArt species={species} mood={mood} pose={state === 'sleeping' ? 'sleeping' : undefined} bodyColour={bodyColour} frame={{ ...neutral, expression: state === 'pleased' ? 'pleased' : 'mood', eyeOpen: state === 'blink' ? 0.1 : 1 }} />
        const { pixels } = new Resvg(renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg" width={200} height={200} viewBox="0 0 200 200">{content}</svg>)).render()
        let creamPixels = 0, inkPixels = 0
        for (let y = 100; y < 166; y++) for (let x = 60; x < 140; x++) {
          const at = (y * 200 + x) * 4
          if (pixels[at] > 235 && pixels[at + 1] > 225 && pixels[at + 2] > 210 && pixels[at + 3] > 240) creamPixels++
          if (pixels[at] === 43 && pixels[at + 1] === 30 && pixels[at + 2] === 47 && pixels[at + 3] > 240) inkPixels++
        }
        expect(creamPixels, `${species}/${bodyColour}/${state} visible face backing`).toBeGreaterThan(150)
        expect(inkPixels, `${species}/${bodyColour}/${state} original facial ink`).toBeGreaterThan(40)
      }
    }
    for (const bodyColour of [PALETTE.white, PALETTE.sakura, PALETTE.petDefault, PALETTE.sky]) {
      const { container } = mount(<svg><CharacterArt species="bun" mood="happy" bodyColour={bodyColour} /></svg>)
      expect(container.querySelector('[data-face-contrast]')).toBeNull()
    }
  })

  it('keeps the reported ear, paw and chef-hat extrema inside the art box at room stroke weight', () => {
    const cases = [
      ['mochi', 'happy', 'celebrate-big', [0.76]], ['mochi', 'happy', 'celebrate-big', [0.76], 'combined'],
      ['mochi', 'content', 'celebrate-big', [0.76]], ['mochi', 'meh', 'celebrate-big', [0.68, 0.76]],
      ['mochi', 'scruffy', 'celebrate-big', [0.64, 0.68, 0.76]],
      ['mochi', 'happy', 'celebrate', [0.42], 'chef-hat'], ['mochi', 'happy', 'celebrate-big', [0.42], 'chef-hat'],
      ['bun', 'meh', 'affection', [0.42, 0.64, 0.68]], ['bun', 'meh', 'reach', [0.42, 0.64, 0.68]],
      ['bun', 'scruffy', 'affection', [0.42]],
    ] as const
    for (const [species, mood, action, phases, head] of cases) for (const phase of phases) for (const strokeScale of [1, 1.6]) {
      const frame = sampleMotion({ species, mood, action, elapsedMs: ACTION_MS[action] * phase, distance: 0, durationMs: ACTION_MS[action], reducedMotion: false })
      const { pixels } = new Resvg(renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg" width={240} height={240} viewBox="-20 -20 240 240"><AnimatedCharacterArt species={species} mood={mood} bodyColour={PALETTE.petDefault} equipped={head === 'combined' ? outfit : { head }} frame={frame} strokeScale={strokeScale} /></svg>)).render()
      let outside = 0, minX = 240, maxX = 0, minY = 240, maxY = 0
      for (let y = 0; y < 240; y++) for (let x = 0; x < 240; x++) {
        if ((x < 20 || x >= 220 || y < 20 || y >= 220) && pixels[(y * 240 + x) * 4 + 3] > 5) {
          outside++; minX = Math.min(minX, x - 20); maxX = Math.max(maxX, x - 20); minY = Math.min(minY, y - 20); maxY = Math.max(maxY, y - 20)
        }
      }
      expect.soft(outside, `${species}/${mood}/${action}/${phase}/stroke${strokeScale} outside ${minX},${minY}..${maxX},${maxY}`).toBe(0)
    }
  })

  it('keeps closed walking endpoints inside the art box with combined wardrobe and both outline scales', () => {
    for (const [species, blinkMs] of [['bun', 3070], ['mochi', 1370], ['sprout', 5770]] as const) {
      for (const mood of ['happy', 'scruffy'] as const) for (const elapsedMs of [0, 420]) for (const strokeScale of [1, 1.6]) {
        const frame = sampleMotion({ species, mood, action: 'walk', elapsedMs, blinkMs,
          distance: elapsedMs / 420, durationMs: 420, reducedMotion: false,
          groundPath: [{ distance: 0, x: 0, y: 0 }, { distance: 1, x: 64, y: -32 }],
        })
        expect.soft(frame.eyeOpen, `${species}/${mood}/${elapsedMs} closed endpoint`).toBeCloseTo(0.1, 12)
        const { pixels } = new Resvg(renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg" width={240} height={240} viewBox="-20 -20 240 240"><AnimatedCharacterArt species={species} mood={mood} bodyColour={PALETTE.petDefault} equipped={outfit} frame={frame} strokeScale={strokeScale} /></svg>), { font: { loadSystemFonts: false } }).render()
        let outside = 0
        for (let y = 0; y < 240; y++) for (let x = 0; x < 240; x++) {
          if ((x < 20 || x >= 220 || y < 20 || y >= 220) && pixels[(y * 240 + x) * 4 + 3] > 5) outside++
        }
        expect.soft(outside, `${species}/${mood}/${elapsedMs}/stroke${strokeScale}`).toBe(0)
      }
    }
  })

  it('keeps projected uphill feet inside the unchanged art box on both axes and facings', () => {
    // These path-only art renders do not need a system-font scan per sample.
    for (const [species, stride] of [['bun', 0.72], ['mochi', 0.9], ['sprout', 0.82]] as const) {
      for (const dx of [64, -64]) for (const facing of [1, -1] as const) {
        const groundPath = [{ distance: 0, x: 0, y: 0 }, { distance: 4, x: dx * 4, y: -128 }]
        const distance = 0.49 * stride
        const frame = sampleMotion({ species, mood: 'happy', action: 'walk', elapsedMs: distance * 420, durationMs: 1680, blinkMs: 0, distance, groundPath, facing, reducedMotion: false })
        const { pixels } = new Resvg(renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg" width={240} height={240} viewBox="-20 -20 240 240"><g transform={facing === -1 ? 'translate(200 0) scale(-1 1)' : undefined}><AnimatedCharacterArt species={species} mood="happy" bodyColour={PALETTE.petDefault} frame={frame} strokeScale={1.6} /></g></svg>), { font: { loadSystemFonts: false } }).render()
        let outside = 0
        for (let y = 0; y < 240; y++) for (let x = 0; x < 240; x++) {
          if ((x < 20 || x >= 220 || y < 20 || y >= 220) && pixels[(y * 240 + x) * 4 + 3] > 5) outside++
        }
        expect.soft(outside, `${species}/uphill${dx}/facing${facing}`).toBe(0)
      }
    }
  })

  it('keeps both soles grounded at the initial supported handoff despite torso bob', () => {
    const { container, rerender } = mount(<svg />)
    for (const [species, stride] of [['bun', 0.72], ['mochi', 0.9], ['sprout', 0.82]] as const) {
      for (const [dx, dy] of [[64, 32], [-64, 32], [64, -32], [-64, -32]]) for (const facing of [1, -1] as const) {
        const groundPath = [{ distance: 0, x: 0, y: 0 }, { distance: 3, x: dx * 3, y: dy * 3 }]
        const points = [-1e-6, 0, 1e-6].map((offset) => {
          const distance = stride * (0.25 + offset)
          const frame = sampleMotion({ species, mood: 'happy', action: 'walk', distance, elapsedMs: 400, durationMs: 1260, groundPath, facing, blinkMs: 0, reducedMotion: false })
          if (offset === 0) {
            expect(frame.leftFoot).toBe(0)
            expect(frame.rightFoot).toBe(0)
            expect(frame.bodyY).toBeLessThan(0)
          }
          rerender(<svg><g transform={`translate(${dx * distance * 0.125} ${dy * distance * 0.125}) scale(0.125)`}><g transform={facing === -1 ? 'translate(200 0) scale(-1 1)' : undefined}><AnimatedCharacterArt species={species} mood="happy" bodyColour={PALETTE.petDefault} frame={frame} /></g></g></svg>)
          return (['left', 'right'] as const).map((side) => {
            const foot = container.querySelector(`[data-foot="${side}"] ellipse`)!
            const point = worldPoint(foot, Number(foot.getAttribute('cx')), Number(foot.getAttribute('cy')) + 9)
            expect(point[1]).toBeCloseTo((dy * distance + 187 + frame[`${side}GroundY`]! - frame[`${side}Foot`]) * 0.125, 7)
            return point
          })
        })
        expect(points[0][1][0]).toBeCloseTo(points[1][1][0], 7)
        expect(points[0][1][1]).toBeCloseTo(points[1][1][1], 7)
        expect(points[2][0][0]).toBeCloseTo(points[1][0][0], 7)
        expect(points[2][0][1]).toBeCloseTo(points[1][0][1], 7)
      }
    }
  })

  it('leaves heavy-outline bounds clearance at fast handoff and partial-stride uphill arrival', () => {
    for (const [species, stride] of [['bun', 0.72], ['mochi', 0.9], ['sprout', 0.82]] as const) {
      for (const dx of [64, -64]) for (const facing of [1, -1] as const) for (const mood of ['happy', 'scruffy'] as const) {
        const groundPath = [{ distance: 0, x: 0, y: 0 }, { distance: 0.31, x: dx * 0.31, y: -9.92 }, { distance: 1.13, x: dx * -0.51, y: -36.16 }]
        for (const distance of [stride * 0.25, 1.12]) {
          const frame = sampleMotion({ species, mood, action: 'walk', elapsedMs: distance / 1.13 * 270, durationMs: 270, blinkMs: 0, distance, groundPath, facing, reducedMotion: false })
          const { pixels } = new Resvg(renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg" width={240} height={240} viewBox="-20 -20 240 240"><g transform={facing === -1 ? 'translate(200 0) scale(-1 1)' : undefined}><AnimatedCharacterArt species={species} mood={mood} bodyColour={PALETTE.petDefault} equipped={outfit} frame={frame} strokeScale={1.6} /></g></svg>), { font: { loadSystemFonts: false } }).render()
          let outside = 0
          for (let y = 0; y < 240; y++) for (let x = 0; x < 240; x++) {
            if ((x < 20 || x >= 220 || y < 20 || y >= 220) && pixels[(y * 240 + x) * 4 + 3] > 5) outside++
          }
          expect.soft(outside, `${species}/${mood}/uphill${dx}/facing${facing}/d${distance}`).toBe(0)
        }
      }
    }
  })
})
