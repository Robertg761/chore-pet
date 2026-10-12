// Small source-art identity audit; no browser, image generation or PNG output.
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'

const destination = process.argv[2]
if (!destination) throw new Error('Pass a destination JSON path')
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
try {
  const { OBJECT_ART } = await server.ssrLoadModule('/src/room/objects/index.ts')
  const { ALL_ENTRIES } = await server.ssrLoadModule('/src/catalog/objects.ts')
  const sha = (value) => createHash('sha256').update(value).digest('hex')
  const drawings = Object.fromEntries(ALL_ENTRIES.flatMap(({ id }) => ['clean', 'messy1', 'messy2'].map(stage => {
    const markup = renderToStaticMarkup(React.createElement('svg', null, OBJECT_ART[id].render(stage)))
    return [`${id}/${stage}`, { sha256: sha(markup), bytes: Buffer.byteLength(markup) }]
  })))
  const sources = (await readdir('src/room/objects')).filter(name => /\.tsx?$/.test(name)).sort().map(name => `src/room/objects/${name}`)
  sources.push('docs/audits/2026-10-12-character-polish/hash-object-art.mjs')
  const sourceSha256 = {}
  for (const source of sources) sourceSha256[source] = sha(await readFile(source))
  await writeFile(destination, JSON.stringify({ method: 'Exact production SVG markup SHA-256 for all24 catalog objects at all3 conditions. React keys are not serialized; geometry, attributes and child order are.', drawings, sourceSha256 }, null, 2) + '\n')
  console.log(`${Object.keys(drawings).length} production SVG drawings hashed`)
} finally {
  await server.close()
}
