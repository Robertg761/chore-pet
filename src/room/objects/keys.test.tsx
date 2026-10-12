// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { ALL_ENTRIES } from '../../catalog/objects'
import type { MessStage } from '../../domain/types'
import { render } from '../../test/react'
import { OBJECT_ART } from './index'

// Attribute order and SVG self-closing syntax differ between server and client.
// Compare the full drawing tree, including text, order and every attribute.
function drawing(node: Element): unknown {
  return {
    tag: node.tagName,
    attributes: [...node.attributes].map(({ name, value }) => [name, value]).sort(([a], [b]) => a.localeCompare(b)),
    children: [...node.childNodes].map((child) => child instanceof Element ? drawing(child) : child.textContent),
  }
}

it.each(ALL_ENTRIES.map(({ id }) => id))('%s keeps every shape and unique keys when its condition changes', (id) => {
  const art = OBJECT_ART[id]
  const warnings: string[] = []
  const originalError = console.error
  const errors = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = args.map(String).join(' ')
    if (message.includes('Encountered two children with the same key')) warnings.push(message)
    else originalError(...args)
  })
  const scene = (stage: MessStage) => <svg>{art.render(stage)}</svg>
  const expected = new Map<MessStage, unknown>()
  for (const stage of ['clean', 'messy1', 'messy2'] as const) {
    const fresh = document.createElement('div')
    fresh.innerHTML = renderToStaticMarkup(scene(stage))
    expected.set(stage, drawing(fresh.firstElementChild!))
  }
  const ui = render(scene('clean'))
  try {
    for (const stage of ['clean', 'messy1', 'messy2', 'clean', 'messy2', 'messy1', 'clean'] as const) {
      ui.rerender(scene(stage))
      expect(drawing(ui.container.firstElementChild!), `${id}/${stage}: live drawing matches a fresh drawing`).toEqual(expected.get(stage))
    }
    expect(warnings, `${id}: duplicate sibling keys`).toEqual([])
  } finally {
    ui.unmount()
    errors.mockRestore()
  }
})
