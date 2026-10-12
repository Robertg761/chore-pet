// Bounded production stills; run from repository root with before/after label.
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Resvg } from '@resvg/resvg-js'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const label = process.argv[2]
if (!['before', 'after'].includes(label)) throw new Error('Expected before or after')
const out = 'docs/audits/2026-10-12-character-polish'
const baselineCommit = '9b5b4f8'
const baseline = label === 'before' ? new Map(await Promise.all(['src/pet/activityMotion.ts', 'src/character/species/animatedBody.tsx', 'src/character/parts.tsx'].map(async path => [path, await readFile(`${out}/eye-attention-baseline/${path}.txt`, 'utf8')]))) : new Map()
const server = await createServer({ plugins: [{ name: 'exact-baseline-sample', enforce: 'pre', transform(code, id) {
  const source = baseline.get(id.split('?')[0].replace(`${process.cwd()}/`, ''))
  if (source !== undefined) return { code: source, map: null }
} }], server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
try {
  const load = path => server.ssrLoadModule(`/src/${path}`)
  const { Room } = await load('room/Room.tsx')
  const { AnimatedCharacterArt } = await load('character/AnimatedCharacter.tsx')
  const { ACTION_MS } = await load('character/motion.ts')
  const { SPECIES_COLOUR, PALETTE } = await load('art/palette.ts')
  const { petObstacles } = await load('pet/obstacles.ts')
  const { overlaps, checkPlacement } = await load('room/grid.ts')
  const { catalogEntry } = await load('catalog/objects.ts')
  const { interactionTargets } = await load('pet/interactions.ts')
  const { initialPet, step, positionAt } = await load('pet/behaviour.ts')
  const { motionFor } = await load('pet/activityMotion.ts')
  const { PET_STROKE_SCALE, roomPoint } = await load('room/shell/geometry.ts')
  const h = React.createElement, rooms = [], closeups = [], samples = []
  const equipped = { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' }
  for (const species of ['mochi', 'bun', 'sprout']) for (const id of ['poster', 'teddy']) for (const rotation of [0, 1]) {
    const object = { id: 'detail', roomId: 'room', catalogId: id, tileX: id === 'poster' ? rotation ? 4 : 0 : 7, tileY: id === 'poster' ? rotation ? 0 : 4 : 7, rotation }
    if (!checkPlacement(catalogEntry(id), object, [], catalogEntry).ok) throw new Error(`Invalid placed fixture:${id}/${rotation}`)
    const stages = { detail: 'clean' }, solid = petObstacles([object], stages)
    const free = tile => tile.tx >= 0 && tile.ty >= 0 && tile.tx < 8 && tile.ty < 8 && !solid.some(box => overlaps(box, { ...tile, w: 1, d: 1 }))
    const targets = interactionTargets([object], free, stages), target = targets[0]
    const world = { free, mood: 'happy', away: false, mess: null, interactions: targets }
    let state = initialPet(target.tile, 0)
    state.activity.until = 0
    state = step(state, world, 0, () => 0)
    state = step(state, world, ACTION_MS.turn, () => 0)
    const now = ACTION_MS.turn + ACTION_MS.inspect * .42
    state = step(state, world, now, () => 0)
    if (state.activity.kind !== 'interact' || state.activity.phase !== 'action') throw new Error('Expected actual inspect action')
    const frame = motionFor(state, now, species, 'happy', false).frame
    const draw = strokeScale => h(AnimatedCharacterArt, { species, mood: 'happy', bodyColour: SPECIES_COLOUR[species], equipped, frame, strokeScale })
    const point = roomPoint(target.gaze.tx, target.gaze.ty)
    const title = `${species} ${id}, mirror ${rotation}`
    rooms.push({ title, art: h(Room, { room: { floorStyle: 'birch', wallStyle: 'sage' }, objects: [object], stages, width: 390,
      pet: { tile: positionAt(state, now), facing: state.facing, art: draw(PET_STROKE_SCALE) },
      overlay: h('g', { stroke: PALETTE.accent, fill: 'none', strokeWidth: 1 }, h('circle', { cx: point.x, cy: point.y, r: 3 })) }) })
    for (const size of [200, 60, 25]) closeups.push({ title: `${title}, ${size}px`, art: h('g', { transform: `translate(8 6) scale(${size / 200})` },
      h('g', { transform: state.facing === -1 ? 'translate(200 0) scale(-1 1)' : undefined }, draw(size === 25 ? PET_STROKE_SCALE : 1))) })
    samples.push({ species, id, rotation, facing: state.facing, standing: positionAt(state, now), gaze: target.gaze, frame, contact: target.contact })
  }
  async function sheet(cells, width, height, columns, name) {
    const markup = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: width * columns, height: height * Math.ceil(cells.length / columns) },
      h('rect', { width: '100%', height: '100%', fill: PALETTE.cream }), cells.map((cell, i) => h('g', { key: i, transform: `translate(${i % columns * width} ${Math.floor(i / columns) * height})` }, cell.art,
        h('text', { x: 8, y: height - 8, fontSize: 10, fill: PALETTE.ink }, cell.title)))))
    await writeFile(`${out}/${name}`, new Resvg(markup).render().asPng())
  }
  await sheet(rooms, 390, 350, 3, `eye-attention-${label}-rooms.png`)
  await sheet(closeups, 220, 235, 6, `eye-attention-${label}-sizes.png`)
  const sources = ['src/pet/activityMotion.ts', 'src/pet/behaviour.ts', 'src/pet/interactions.ts', 'src/character/AnimatedCharacter.tsx', 'src/character/species/animatedBody.tsx', 'src/character/motion.ts', 'src/character/parts.tsx', 'src/room/Room.tsx', 'src/room/shell/geometry.ts', `${out}/capture-eye-attention.mjs`]
  if (label === 'after') sources.push('src/character/eyeGeometry.ts')
  const sha = async path => createHash('sha256').update(baseline.get(path) ?? await readFile(path)).digest('hex')
  const captureFiles = [`eye-attention-${label}-rooms.png`, `eye-attention-${label}-sizes.png`]
  await writeFile(`${out}/eye-attention-${label}.json`, JSON.stringify({ baselineCommit: label === 'before' ? baselineCommit : null, overriddenSources: [...baseline.keys()], method: '12 actual behavior-derived production Room stills and36 dressed character views at200/60/25px; poster/teddy, all3 species, both mirrors,42% inspect action. Static evidence only; no live clock or human playback. Source list covers direct sampled geometry/placement, not every transitive asset dependency.', samples,
    sourceSha256: Object.fromEntries(await Promise.all(sources.map(async path => [path, await sha(path)]))),
    captureSha256: Object.fromEntries(await Promise.all(captureFiles.map(async path => [path, await sha(`${out}/${path}`)]))) }, null, 2) + '\n')
  console.log(`Wrote ${label}:12 Room stills and36 size views`)
} finally { await server.close() }
