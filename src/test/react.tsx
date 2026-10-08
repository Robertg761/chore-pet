import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

export function render(content: ReactNode) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  act(() => root.render(content))
  return {
    container,
    rerender(next: ReactNode) { act(() => root.render(next)) },
    unmount() { act(() => root.unmount()); container.remove() },
  }
}
export function input(element: HTMLInputElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
export function click(element: Element) { act(() => (element as HTMLElement).click()) }
