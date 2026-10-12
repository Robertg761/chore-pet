// Run from the repository root; bounded stills from actual art and behavior.
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Resvg } from '@resvg/resvg-js'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const out = 'docs/audits/2026-10-12-character-polish'
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
try {
  const { OBJECT_ART } = await server.ssrLoadModule('/src/room/objects/index.ts')
  const { Room } = await server.ssrLoadModule('/src/room/Room.tsx')
  const { AnimatedCharacterArt } = await server.ssrLoadModule('/src/character/AnimatedCharacter.tsx')
  const { ACTION_MS } = await server.ssrLoadModule('/src/character/motion.ts')
  const { PALETTE, SPECIES_COLOUR } = await server.ssrLoadModule('/src/art/palette.ts')
  const { catalogEntry } = await server.ssrLoadModule('/src/catalog/objects.ts')
  const { footprintOf, overlaps } = await server.ssrLoadModule('/src/room/grid.ts')
  const { interactionTargets } = await server.ssrLoadModule('/src/pet/interactions.ts')
  const { initialPet, step, positionAt } = await server.ssrLoadModule('/src/pet/behaviour.ts')
  const { motionFor } = await server.ssrLoadModule('/src/pet/activityMotion.ts')
  const { iso } = await server.ssrLoadModule('/src/room/iso.ts')
  const { roomPoint, PET_STROKE_SCALE } = await server.ssrLoadModule('/src/room/shell/geometry.ts')
  const h = React.createElement, scenes = [], details = [], samples = []
  const species = ['mochi', 'bun', 'sprout']
  for (const id of ['shower', 'toilet', 'washer']) for (const stage of ['clean', 'messy1', 'messy2']) for (const rotation of [0, 1]) {
    const object = { id: 'detail', roomId: 'room', catalogId: id, tileX: 2, tileY: 2, rotation }
    const entry = catalogEntry(id), footprint = footprintOf(object, entry)
    const free = tile => tile.tx >= 0 && tile.ty >= 0 && tile.tx < 8 && tile.ty < 8 && !overlaps(footprint, { ...tile, w: 1, d: 1 })
    const stages = { detail: stage }, targets = interactionTargets([object], free, stages), target = targets[0]
    const world = { free, mood: 'happy', away: false, mess: null, interactions: targets }
    let state = initialPet(target.tile, 0)
    state.activity.until = 0
    state = step(state, world, 0, () => 0)
    state = step(state, world, ACTION_MS.turn, () => 0)
    const now = ACTION_MS.turn + ACTION_MS[target.action] * 0.42
    state = step(state, world, now, () => 0)
    if (state.activity.kind !== 'interact' || state.activity.phase !== 'action') throw new Error(`Expected real interaction action for ${id}/${stage}`)
    const s = species[Math.floor(scenes.length / 2) % 3], sampled = motionFor(state, now, s, 'happy', false)
    const point = iso(target.gaze.tx - 2, target.gaze.ty - 2), screen = roomPoint(target.gaze.tx, target.gaze.ty)
    const marker = (x, y, radius) => h('g', { fill: 'none', stroke: PALETTE.accent, strokeWidth: 1.25, pointerEvents: 'none' },
      h('circle', { cx: x, cy: y, r: radius }), h('path', { d: `M${x - radius - 2} ${y} h${radius * 2 + 4} M${x} ${y - radius - 2} v${radius * 2 + 4}` }))
    const label = `${id} ${stage}, rotation ${rotation}`
    details.push({ label, art: h('g', { transform: 'translate(100 130)' }, h('g', { transform: rotation ? 'scale(-1 1)' : undefined }, OBJECT_ART[id].render(stage)), marker(point.x, point.y, 3)) })
    scenes.push({ label: `${s}: ${label}, ${target.action}`, art: h(Room, { room: { floorStyle: 'mosaic', wallStyle: 'cloud' }, objects: [object], stages, width: 390,
      pet: { tile: positionAt(state, now), facing: state.facing, art: h(AnimatedCharacterArt, { species: s, mood: 'happy', bodyColour: SPECIES_COLOUR[s], frame: sampled.frame, equipped: { face: 'glasses' }, strokeScale: PET_STROKE_SCALE }) },
      overlay: marker(screen.x, screen.y, 2.5) }) })
    samples.push({ id, stage, rotation, species: s, standing: positionAt(state, now), facing: state.facing, action: sampled.action, phase: state.activity.phase, localGaze: point, contact: target.contact })
  }
  async function sheet(cells, width, height, name) {
    const rows = Math.ceil(cells.length / 4), svg = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: width * 4, height: height * rows },
      h('rect', { width: '100%', height: '100%', fill: PALETTE.cream }), cells.map((cell, i) => h('g', { key: i, transform: `translate(${i % 4 * width} ${Math.floor(i / 4) * height})` },
        cell.art, h('text', { x: 8, y: height - 8, fontSize: 10, fill: PALETTE.ink }, cell.label)))))
    await writeFile(`${out}/${name}`, new Resvg(svg).render().asPng())
  }
  await sheet(details, 200, 220, 'bathroom-targets.png')
  await sheet(scenes, 390, 350, 'bathroom-rooms.png')
  const sources = ['src/pet/interactions.ts', 'src/pet/behaviour.ts', 'src/pet/activityMotion.ts', 'src/character/AnimatedCharacter.tsx', 'src/character/motion.ts', 'src/room/Room.tsx', ...['shower', 'toilet', 'washer', 'batch2-parts', 'shapes3', 'mess'].map(id => `src/room/objects/${id}.tsx`), `${out}/capture-bathroom.mjs`]
  const sourceSha256 = Object.fromEntries(await Promise.all(sources.map(async p => [p, createHash('sha256').update(await readFile(p)).digest('hex')])))
  await writeFile(`${out}/bathroom-captures.json`, JSON.stringify({ method: '18 annotated production object details and18 Room SVG stills. Real initialPet/step transitions choose orientation/action from an adjacent tile, then motionFor samples42% through the action. Glasses on all species. Separate from a live LivingRoom clock or human temporal playback.', samples, sourceSha256 }, null, 2) + '\n')
  console.log(`${details.length} annotated object details; ${scenes.length} behavior-derived Room stills`)
} finally { await server.close() }
