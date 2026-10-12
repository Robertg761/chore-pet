// Reproducible review captures from production React/SVG, without a browser.
// node scripts/render-pet-motion.mjs [output-directory] [--video] [--bounds] [--ground-bounds]
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Resvg } from '@resvg/resvg-js'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import path from 'node:path'

const output = process.argv.slice(2).find(arg => !arg.startsWith('--')) ?? '/tmp/chore-pet-motion-review'
await mkdir(output, { recursive: true })
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
const h = React.createElement
try {
  const { AnimatedCharacterArt } = await server.ssrLoadModule('/src/character/AnimatedCharacter.tsx')
  const { sampleMotion, ACTION_MS } = await server.ssrLoadModule('/src/character/motion.ts')
  const { PALETTE, SPECIES_COLOUR } = await server.ssrLoadModule('/src/art/palette.ts')
  const { ITEMS } = await server.ssrLoadModule('/src/character/items.tsx')
  const { Room } = await server.ssrLoadModule('/src/room/Room.tsx')
  const { catalogEntry } = await server.ssrLoadModule('/src/catalog/objects.ts')
  const { footprintOf, overlaps } = await server.ssrLoadModule('/src/room/grid.ts')
  const { interactionTargets } = await server.ssrLoadModule('/src/pet/interactions.ts')
  const { initialPet, step, positionAt, TIMING } = await server.ssrLoadModule('/src/pet/behaviour.ts')
  const { motionFor } = await server.ssrLoadModule('/src/pet/activityMotion.ts')
  const { roomPoint, PET_STROKE_SCALE } = await server.ssrLoadModule('/src/room/shell/geometry.ts')
  const species = ['mochi', 'bun', 'sprout']
  const moods = ['happy', 'content', 'meh', 'scruffy', 'sick']
  const actions = Object.keys(ACTION_MS)
  const colors = { default: null, yellow: PALETTE.petDefault, pink: PALETTE.sakura, sky: PALETTE.sky, white: PALETTE.white, dark: PALETTE.ink }
  const combined = { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' }
  const manifest = { renderer: 'AnimatedCharacterArt', sampler: 'sampleMotion', sheets: [], sampleCount: 0 }
  manifest.sourceSha256 = Object.fromEntries(await Promise.all([
    'src/character/motion.ts', 'src/character/AnimatedCharacter.tsx',
    'src/character/species/animatedBody.tsx', 'src/character/Character.tsx',
    'src/character/parts.tsx', 'src/pet/behaviour.ts', 'src/pet/activityMotion.ts',
    'scripts/render-pet-motion.mjs',
  ].map(async file => [file, createHash('sha256').update(await readFile(file)).digest('hex')])))

  function art(s, mood, action, phase, options = {}) {
    const durationMs = options.durationMs ?? ACTION_MS[action]
    const elapsedMs = phase * durationMs
    const frame = sampleMotion({ species: s, mood, action, elapsedMs, blinkMs: options.blinkMs ?? elapsedMs,
      durationMs, distance: options.distance ?? phase * 3, groundPath: options.groundPath, facing: options.facing,
      reducedMotion: options.reducedMotion ?? false })
    return h(AnimatedCharacterArt, { species: s, mood, bodyColour: options.color ?? SPECIES_COLOUR[s],
      equipped: options.equipped ?? {}, look: options.look, pose: options.pose, strokeScale: options.strokeScale ?? 1, frame })
  }
  async function save(name, rows, columns, options = {}) {
    const cell = options.cell ?? 210
    const rowHeight = cell + 44
    const width = columns * cell, height = rows.length * rowHeight
    const groups = []
    rows.forEach((row, y) => row.forEach((entry, x) => {
      const key = `${y}-${x}`
      groups.push(h('g', { key, transform: `translate(${x * cell + 5} ${y * rowHeight + 5}) scale(${(cell - 10) / 200})` }, entry.art))
      const lines = ['']
      for (const word of entry.label.split(' ')) {
        const last = lines.length - 1
        if (lines[last] && lines[last].length + word.length + 1 > Math.floor(cell / 7.2)) lines.push(word)
        else lines[last] += `${lines[last] ? ' ' : ''}${word}`
      }
      groups.push(h('text', { key: `${key}-label`, x: x * cell + 4, y: y * rowHeight + cell + 10, fill: PALETTE.ink, fontSize: 10 },
        lines.map((line, i) => h('tspan', { key: i, x: x * cell + 4, dy: i ? 11 : 0 }, line))))
    }))
    const svg = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width, height, viewBox: `0 0 ${width} ${height}` },
      h('rect', { width, height, fill: PALETTE.ground }), groups))
    await writeFile(path.join(output, `${name}.png`), new Resvg(svg).render().asPng())
    manifest.sheets.push({ name, width, height, samples: rows.flat().length })
    manifest.sampleCount += rows.flat().length
  }
  for (const s of species) {
    for (const mood of moods) {
      await save(`${s}-${mood}`, [0, 0.42, 0.76].map(phase => actions.map(action => ({
        label: `${action} ${Math.round(phase * 100)}%`, art: art(s, mood, action, phase),
      }))), actions.length)
    }
    await save(`${s}-colors`, Object.entries(colors).map(([name, color]) => actions.map(action => ({
      label: `${name} ${action}`, art: art(s, 'happy', action, 0.42, { color }),
    }))), actions.length)
    const wardrobe = [...ITEMS.map(item => ({ name: item.id, equipped: { [item.slot]: item.id } })), { name: 'combined', equipped: combined }]
    for (let page = 0; page < Math.ceil(wardrobe.length / 6); page++) {
      await save(`${s}-wardrobe-${page + 1}`, wardrobe.slice(page * 6, (page + 1) * 6).map(({ name, equipped }) =>
        ['greet', 'celebrate-big', 'reach'].flatMap(action => [0.42, 0.76].map(phase => ({
          label: `${name} ${action} ${Math.round(phase * 100)}%`, art: art(s, 'happy', action, phase, { equipped }),
        })))), 6)
    }
    for (let page = 0; page < 3; page++) {
      await save(`${s}-small-${page + 1}`, [60, 25].map(size => actions.slice(page * 5, (page + 1) * 5).map(action => ({ label: `${action} ${size}px`,
        art: h('g', { transform: `translate(${(200 - size) / 2} ${200 - size}) scale(${size / 200})` }, art(s, 'happy', action, 0.42, { equipped: combined, strokeScale: size === 25 ? PET_STROKE_SCALE : 1 })),
      }))), 5, { cell: 210 })
    }
    await save(`${s}-sleep-notice`, [0, 0.42, 0.76].map(phase => ['happy', 'sick'].map(mood => ({
      label: `${mood === 'sick' ? 'sick' : 'sleeping'} notice ${Math.round(phase * 100)}%`,
      art: art(s, mood, 'notice', phase, { pose: mood === 'sick' ? 'sick' : 'sleeping', equipped: combined }),
    }))), 2)

    const scenarios = [ ['plant', 'clean'], ['fish-tank', 'clean'], ['bookshelf', 'clean'], ['couch', 'clean'],
      ['teddy', 'messy2'], ['washer', 'messy2'], ['plant', 'messy2'], ['dining-table', 'clean'] ]
    const scenes = []
    for (const [catalogId, stage] of scenarios) for (const rotation of [0, 1]) {
      const object = { id: 'review-object', roomId: 'review-room', catalogId, tileX: 2, tileY: 2, rotation }
      const entry = catalogEntry(catalogId)
      const footprint = footprintOf(object, entry)
      const free = tile => tile.tx >= 0 && tile.ty >= 0 && tile.tx < 8 && tile.ty < 8 &&
        (entry.layer !== 'solid' || !overlaps(footprint, { ...tile, w: 1, d: 1 }))
      const target = interactionTargets([object], free, { [object.id]: stage })[0]
      const stand = roomPoint(target.tile.tx + 0.5, target.tile.ty + 0.5)
      const gaze = roomPoint(target.gaze.tx, target.gaze.ty)
      const state = { ...initialPet(target.tile, 0), facing: gaze.x < stand.x ? -1 : 1,
        activity: { kind: 'interact', phase: 'action', target, start: 0, until: ACTION_MS[target.action] } }
      const frame = motionFor(state, ACTION_MS[target.action] * 0.42, s, 'happy', false).frame
      const sceneArt = h(AnimatedCharacterArt, { species: s, mood: 'happy', bodyColour: SPECIES_COLOUR[s], equipped: combined, frame, strokeScale: PET_STROKE_SCALE })
      scenes.push({ label: `${catalogId} ${stage} rotation ${rotation}: ${target.action}, contact=false`,
        art: h(Room, { room: { floorStyle: 'birch', wallStyle: 'sage' }, objects: [object], stages: { [object.id]: stage },
          width: 390, pet: { tile: target.tile, facing: state.facing, art: sceneArt } }) })
    }
    const roomGroups = scenes.flatMap((scene, i) => [
      h('g', { key: `room-${i}`, transform: `translate(${i % 4 * 390} ${Math.floor(i / 4) * 350})` }, scene.art),
      h('text', { key: `room-label-${i}`, x: i % 4 * 390 + 8, y: Math.floor(i / 4) * 350 + 342, fill: PALETTE.ink, fontSize: 10 }, scene.label),
    ])
    const roomsSvg = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 1560, height: 1400 },
      h('rect', { width: 1560, height: 1400, fill: PALETTE.ground }), roomGroups))
    await writeFile(path.join(output, `${s}-rooms.png`), new Resvg(roomsSvg).render().asPng())
    manifest.sheets.push({ name: `${s}-rooms`, width: 1560, height: 1400, samples: scenes.length })
    manifest.sampleCount += scenes.length
  }

  if (process.argv.includes('--bounds')) {
    const failures = []
    let samples = 0
    for (const s of species) {
      const cases = moods.map(mood => ({ name: mood, mood, equipped: {} })).concat(
        ITEMS.map(item => ({ name: item.id, mood: 'happy', equipped: { [item.slot]: item.id } })),
        moods.map(mood => ({ name: `combined-${mood}`, mood, equipped: combined })))
      for (const choice of cases) for (const action of actions) for (const strokeScale of [1, PET_STROKE_SCALE]) for (const phase of [0, 0.1, 0.18, 0.3, 0.42, 0.64, 0.68, 0.76, 0.84, 0.92, 1]) {
        const svg = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 240, height: 240, viewBox: '-20 -20 240 240' },
          art(s, choice.mood, action, phase, { equipped: choice.equipped, strokeScale })))
        const rendered = new Resvg(svg, { font: { loadSystemFonts: false } }).render()
        const pixels = rendered.pixels
        let outside = 0
        for (let y = 0; y < 240; y++) for (let x = 0; x < 240; x++) {
          if (x >= 20 && x < 220 && y >= 20 && y < 220) continue
          if (pixels[(y * 240 + x) * 4 + 3] > 5) outside++
        }
        samples++
        if (outside) {
          const name = `${s}-${choice.name}-${action}-${phase}-stroke${strokeScale}`
          failures.push({ name, outsidePixels: outside })
          if (failures.length <= 20) await writeFile(path.join(output, `bounds-${name}.png`), rendered.asPng())
        }
      }
    }
    manifest.bounds = { samples, alphaThreshold: 5, artBox: [0, 0, 200, 200], outside: failures }
    if (failures.length) process.exitCode = 1
    console.log(`Bounds: ${samples} samples, ${failures.length} outside the art box`)
  }

  if (process.argv.includes('--ground-bounds')) {
    const failures = []
    let samples = 0
    const routes = [
      [[0, 0], [3, 0]], [[0, 0], [-3, 0]], [[0, 0], [0, 3]], [[0, 0], [0, -3]],
      [[0, 0], [1, 0], [1, 2]], [[0, 0], [0, -1], [-2, -1]],
    ]
    for (const s of species) for (const mood of moods) for (const [routeIndex, route] of routes.entries()) {
      let distance = 0
      const groundPath = route.map(([tx, ty], i) => {
        if (i) distance += Math.abs(tx - route[i - 1][0]) + Math.abs(ty - route[i - 1][1])
        const point = roomPoint(tx, ty), origin = roomPoint(0, 0)
        return { distance, x: (point.x - origin.x) / 0.33, y: (point.y - origin.y) / 0.33 }
      })
      const phases = mood === 'happy' || mood === 'scruffy'
        ? Array.from({ length: 101 }, (_, i) => i / 100)
        : [0, 0.1, 0.18, 0.3, 0.42, 0.64, 0.68, 0.76, 0.84, 0.92, 1]
      for (const durationMs of [1260, 270]) for (const strokeScale of [1, PET_STROKE_SCALE]) for (const phase of phases) {
        const traveled = phase * distance
        let segment = 1
        while (segment < groundPath.length - 1 && traveled >= groundPath[segment].distance) segment++
        const facing = groundPath[segment].x < groundPath[segment - 1].x ? -1 : 1
        const svg = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 240, height: 240, viewBox: '-20 -20 240 240' },
          art(s, mood, 'walk', phase, { equipped: combined, groundPath, facing, distance: traveled, durationMs, strokeScale })))
        const rendered = new Resvg(svg, { font: { loadSystemFonts: false } }).render()
        const pixels = rendered.pixels
        let outside = 0
        for (let y = 0; y < 240; y++) for (let x = 0; x < 240; x++) {
          if (x >= 20 && x < 220 && y >= 20 && y < 220) continue
          if (pixels[(y * 240 + x) * 4 + 3] > 5) outside++
        }
        samples++
        if (outside) {
          const name = `${s}-${mood}-route${routeIndex}-${durationMs}ms-${phase}-stroke${strokeScale}`
          failures.push({ name, outsidePixels: outside })
          if (failures.length <= 20) await writeFile(path.join(output, `ground-bounds-${name}.png`), rendered.asPng())
        }
      }
    }
    manifest.groundBounds = { samples, alphaThreshold: 5, artBox: [0, 0, 200, 200], routes, outside: failures }
    if (failures.length) process.exitCode = 1
    console.log(`Ground bounds: ${samples} samples, ${failures.length} outside the art box`)
  }

  if (process.argv.includes('--video')) {
    const encode = async (framesDir, name, fps) => {
      for (const [speed, label] of [[1, 'normal'], [0.25, 'slow']]) {
        await new Promise((resolve, reject) => {
          const ffmpeg = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps * speed), '-i', path.join(framesDir, '%05d.png'),
            '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(output, `${name}-${label}.mp4`)], { stdio: 'inherit' })
          ffmpeg.once('error', reject); ffmpeg.once('exit', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))
        })
      }
      await rm(framesDir, { recursive: true })
    }
    const sequences = {
      player: [['idle', 500], ['greet', ACTION_MS.greet], ['affection', ACTION_MS.affection], ['celebrate-big', ACTION_MS['celebrate-big']], ['idle', 500]],
      environment: ['inspect', 'wave', 'rest', 'dust', 'smell', 'concern'].map(action => [action, ACTION_MS[action]]),
      walk: [['walk', 3 * TIMING.stepMs]],
      travel: [['walk', 10 * 90]],
    }
    for (const [name, sequence] of Object.entries(sequences)) {
      const framesDir = path.join(output, `.${name}-frames`)
      await mkdir(framesDir, { recursive: true })
      const duration = sequence.reduce((sum, [, ms]) => sum + ms, 0)
      const walking = name === 'walk' || name === 'travel'
      const fps = walking ? 60 : 30, count = Math.ceil(duration / 1000 * fps) + 1
      const routeDistance = name === 'travel' ? 10 : 3
      const artScale = name === 'travel' ? 0.5 : 0.8
      const columnWidth = name === 'travel' ? 660 : 440
      const width = walking ? columnWidth * 3 : 720, height = walking ? 340 : 260
      // The walking capture magnifies the same signed room projection used by
      // the production integration, so planted contacts can be compared to tiles.
      const tileX = 21.25 / 0.33, tileY = 10.625 / 0.33
      const groundPath = walking ? [{ distance: 0, x: 0, y: 0 }, { distance: routeDistance, x: tileX * routeDistance, y: tileY * routeDistance }] : undefined
      for (let i = 0; i < count; i++) {
        let elapsed = Math.min(duration, i / fps * 1000), action, actionDuration
        for (const [index, [candidate, ms]] of sequence.entries()) {
          action = candidate; actionDuration = ms
          if (elapsed < ms || index === sequence.length - 1) break
          elapsed -= ms
        }
        const distance = elapsed / actionDuration * routeDistance
        const bodies = species.map((s, n) => h('g', { key: s,
          transform: walking ? `translate(${n * columnWidth + 20 + distance * tileX * artScale} ${35 + distance * tileY * artScale}) scale(${artScale})` : `translate(${n * 240 + 20} 35)` },
          art(s, 'happy', action, elapsed / actionDuration, { equipped: combined, blinkMs: i / fps * 1000,
            durationMs: actionDuration, groundPath, distance, facing: 1 })))
        const grid = walking && species.flatMap((s, n) => Array.from({ length: routeDistance + 1 }, (_, tile) => {
          const x = n * columnWidth + 20 + 100 * artScale + tile * tileX * artScale, y = 35 + 187 * artScale + tile * tileY * artScale
          return h('path', { key: `${s}-${tile}`, d: `M${x} ${y - tileY * artScale} l${tileX * artScale} ${tileY * artScale} l${-tileX * artScale} ${tileY * artScale} l${-tileX * artScale} ${-tileY * artScale} Z`, fill: 'none', stroke: PALETTE.ink, strokeOpacity: 0.16 })
        }))
        const svg = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width, height },
          h('rect', { width, height, fill: PALETTE.ground }), grid,
          h('text', { x: 16, y: 22, fill: PALETTE.ink, fontSize: 16 }, `${name}: ${action}, ${Math.round(elapsed)} ms`), bodies))
        await writeFile(path.join(framesDir, `${String(i).padStart(5, '0')}.png`), new Resvg(svg).render().asPng())
      }
      await encode(framesDir, name, fps)
    }
    manifest.videos = Object.keys(sequences).flatMap(name => ['normal', 'slow'].map(speed => `${name}-${speed}.mp4`))

    const roomScenarios = [['plant', 'clean'], ['fish-tank', 'clean'], ['bookshelf', 'clean'], ['couch', 'clean'],
      ['teddy', 'messy2'], ['washer', 'messy2'], ['plant', 'messy2'], ['dining-table', 'clean']].map(([catalogId, stage], i) => {
      const object = { id: `video-object-${i}`, roomId: 'review-room', catalogId, tileX: 2, tileY: 2, rotation: i % 2 }
      const entry = catalogEntry(catalogId), footprint = footprintOf(object, entry)
      const free = tile => tile.tx >= 0 && tile.ty >= 0 && tile.tx < 8 && tile.ty < 8 &&
        (entry.layer !== 'solid' || !overlaps(footprint, { ...tile, w: 1, d: 1 }))
      const stages = { [object.id]: stage }
      const world = { free, mood: 'happy', away: false, mess: null, interactions: interactionTargets([object], free, stages) }
      const state = initialPet({ tx: 0, ty: 0 }, 0)
      state.activity.until = 0
      return { object, stages, world, state, species: species[i % 3] }
    })
    const roomFrames = path.join(output, '.rooms-frames')
    await mkdir(roomFrames, { recursive: true })
    for (let i = 0; i < 140; i++) {
      const now = i * 50
      const scenes = roomScenarios.flatMap((scenario, n) => {
        scenario.state = step(scenario.state, scenario.world, now, () => 0)
        const { state, object, stages, species: s } = scenario
        const frame = motionFor(state, now, s, 'happy', false).frame
        const character = h(AnimatedCharacterArt, { species: s, mood: 'happy', bodyColour: SPECIES_COLOUR[s], frame, strokeScale: PET_STROKE_SCALE })
        return [h('g', { key: `scene-${n}`, transform: `translate(${n % 4 * 390} ${Math.floor(n / 4) * 350})` },
          h(Room, { room: { floorStyle: 'birch', wallStyle: 'sage' }, objects: [object], stages, width: 390,
            pet: { tile: positionAt(state, now), facing: state.facing, art: character } })),
          h('text', { key: `label-${n}`, x: n % 4 * 390 + 8, y: Math.floor(n / 4) * 350 + 341, fill: PALETTE.ink, fontSize: 11 },
            `${s}, ${object.catalogId}, rotation ${object.rotation}: ${state.activity.kind}${state.activity.phase ? `/${state.activity.phase}` : ''}`)]
      })
      const svg = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 1560, height: 700 },
        h('rect', { width: 1560, height: 700, fill: PALETTE.ground }), scenes))
      await writeFile(path.join(roomFrames, `${String(i).padStart(5, '0')}.png`), new Resvg(svg).render().asPng())
    }
    await encode(roomFrames, 'rooms', 20)
    manifest.videos.push('rooms-normal.mp4', 'rooms-slow.mp4')
  }
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`Rendered ${manifest.sampleCount} samples to ${output}`)
} finally { await server.close() }
