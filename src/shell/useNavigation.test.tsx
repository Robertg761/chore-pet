// @vitest-environment jsdom
import { act, StrictMode } from 'react'
import { expect, it } from 'vitest'
import { render, click } from '../test/react'
import { useNavigation } from './useNavigation'

it('keeps Back subscribed through Strict Mode setup and cleanup', async () => {
  history.replaceState(null, '', '/')
  function Screen() {
    const { route, navigation } = useNavigation('account:home')
    return <button onClick={() => navigation.go({ name: 'week' })}>{route.name}</button>
  }
  const ui = render(<StrictMode><Screen /></StrictMode>)
  try {
    click(ui.container.querySelector('button')!)
    expect(ui.container.textContent).toBe('week')
    await act(async () => {
      const popped = new Promise<void>((resolve) => window.addEventListener('popstate', () => resolve(), { once: true }))
      history.back(); await popped
    })
    expect(ui.container.textContent).toBe('home')
  } finally { ui.unmount() }
})
