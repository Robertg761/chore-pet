import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Resvg } from '@resvg/resvg-js'
import { writeFile } from 'node:fs/promises'
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
try {
  const { AnimatedCharacterArt } = await server.ssrLoadModule('/src/character/AnimatedCharacter.tsx')
  const { initialPet, step } = await server.ssrLoadModule('/src/pet/behaviour.ts')
  const { motionFor } = await server.ssrLoadModule('/src/pet/activityMotion.ts')
  const h = React.createElement
  const walking = { ...initialPet({ tx: 2, ty: 2 }, 2650), activity: { kind: 'walk', path: [{ tx: 3, ty: 2 }], stepStart: 2650, then: 'idle' } }
  const arrived = step(walking, { free: () => true, mood: 'happy', away: false, mess: null, interactions: [] }, 3070, () => 0.9)
  const times = [3054, 3069.999, 3070, 3086, 3100, 3110, 3140, 3190]
  const frames = times.map(now => ({ now, frame: motionFor(now < 3070 ? walking : arrived, now, 'bun', 'happy', false).frame }))
  const svg = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 1680, height: 245 },
    h('rect', { width: 1680, height: 245, fill: '#f4f0df' }),
    frames.map(({now, frame}, i) => h('g', { key: i, transform: `translate(${i * 210 + 5} 5)` },
      h(AnimatedCharacterArt, { species: 'bun', mood: 'happy', bodyColour: '#ffd86b', frame }),
      h('text', { x: 4, y: 216, fontSize: 11, fill: '#333044' }, `${now} ms ${now < 3070 ? 'walk' : 'idle'}`),
      h('text', { x: 4, y: 232, fontSize: 11, fill: '#333044' }, `eye ${frame.eyeOpen.toFixed(6)}`)))))
  await writeFile('docs/audits/2026-10-11-character-animation/arrival-blink.png', new Resvg(svg).render().asPng())
  await writeFile('docs/audits/2026-10-11-character-animation/arrival-blink.json', JSON.stringify({ source: 'production step/motionFor/AnimatedCharacterArt', species: 'bun', stepStart: 2650, arriveAt: 3070, samples: frames.map(({now,frame}) => ({ now, eyeOpen: frame.eyeOpen })) }, null, 2) + '\n')
  console.log('Captured actual local arrival blink in 8 production SVG frames')
} finally { await server.close() }
