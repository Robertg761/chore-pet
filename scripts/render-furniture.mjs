// Render the real SVG implementations for visual review, without a browser or network listener.
// Usage: npm run art:furniture -- /tmp/furniture-review
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Resvg } from '@resvg/resvg-js'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = resolve(process.argv[2] ?? '/tmp/chore-pet-furniture-review')
const server = await createServer({
  root,
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, entries: [] },
  appType: 'custom',
})

try {
  const { OBJECT_ART } = await server.ssrLoadModule('/src/room/objects/index.ts')
  const { FURNITURE_STYLES } = await server.ssrLoadModule('/src/catalog/customization.ts')
  const styles = [undefined, ...FURNITURE_STYLES.map(({ id }) => id)]
  const arts = Object.values(OBJECT_ART)
  const stages = ['clean', 'messy1', 'messy2']
  const cellWidth = 260
  const cellHeight = 280
  const columns = styles.length
  await mkdir(output, { recursive: true })

  for (const stage of stages) for (let page = 0; page < Math.ceil(arts.length / 6); page++) {
    const entries = arts.slice(page * 6, (page + 1) * 6)
    const width = cellWidth * columns
    const height = entries.length * cellHeight + 34
    const nodes = [h('rect', { width, height, fill: '#F7F2FC', key: 'background' })]
    styles.forEach((style, column) => nodes.push(h('text', {
      key: `heading-${column}`, x: column * cellWidth + 12, y: 24, fontSize: 18,
    }, style ?? 'Original')))
    entries.forEach((art, row) => styles.forEach((style, column) => {
      const b = art.bounds
      const scale = Math.min((cellWidth - 28) / b.width, (cellHeight - 48) / b.height)
      const appearance = style ? {
        style, finish: stage === 'messy1' ? 'charcoal' : 'natural',
        fabric: stage === 'messy2' ? 'rose' : 'blue',
        pattern: stage === 'clean' ? 'plain' : stage === 'messy1' ? 'stripes' : 'checks',
        details: stage !== 'messy1',
      } : undefined
      nodes.push(h('text', {
        key: `label-${row}-${column}`, x: column * cellWidth + 12,
        y: row * cellHeight + 54, fontSize: 14,
      }, `${art.catalogId} / ${stage}`))
      nodes.push(h('g', {
        key: `art-${row}-${column}`,
        transform: `translate(${column * cellWidth + cellWidth / 2 - (b.x + b.width / 2) * scale} ${row * cellHeight + 68 - b.y * scale}) scale(${scale})`,
      }, art.render(stage, appearance)))
    }))
    const svg = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width, height }, nodes))
    const name = `${stage}-${String(page + 1).padStart(2, '0')}`
    await writeFile(resolve(output, `${name}.svg`), svg)
    await writeFile(resolve(output, `${name}.png`), new Resvg(svg).render().asPng())
  }
  await writeFile(resolve(output, 'coverage.json'), JSON.stringify({
    catalogIds: arts.map(({ catalogId }) => catalogId), styles: styles.map((s) => s ?? 'original'), stages,
    drawings: arts.length * styles.length * stages.length,
  }, null, 2))
  console.log(`Rendered ${arts.length * styles.length * stages.length} furniture drawings to ${output}`)
} finally {
  await server.close()
}
