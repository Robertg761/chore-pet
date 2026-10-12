import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserApp, changeReducedMotion } from './helpers.mjs'

async function restingFixture(page, mode) {
  if (mode === 'reduced') return
  await page.evaluate(mode => new Promise((resolve, reject) => {
    const request = indexedDB.open('chore-pet', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('kv', 'readwrite'), store = tx.objectStore('kv')
      const read = store.get('snapshot')
      read.onsuccess = () => {
        const saved = read.result, home = Object.values(saved.tables.homes)[0]
        const localDay = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        if (mode === 'away') home.vacations = [{ start: localDay(new Date()), end: localDay(new Date()) }]
        else {
          const old = new Date(); old.setDate(old.getDate() - 10)
          for (const chore of Object.values(saved.tables.chores)) {
            chore.createdOn = localDay(old)
            chore.schedule = { kind: 'daily' }
          }
          saved.tables.completions = {}
        }
        saved.outbox = {}
        store.put(saved, 'snapshot')
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }), mode)
}

for (const mode of ['reduced', 'sick', 'away']) {
  test(`the ${mode} resident stops idle frames but completes an explicit response`, async t => {
    const page = await browserApp(t, { reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' })
    await restingFixture(page, mode)
    await page.clock.install()
    await page.clock.pauseAt(Date.now() + 1000)
    await page.addInitScript(() => {
      const request = requestAnimationFrame, cancel = cancelAnimationFrame
      window.__residentClock = { pending: new Set(), delivered: 0 }
      window.requestAnimationFrame = callback => {
        const id = request(now => {
          window.__residentClock.pending.delete(id)
          window.__residentClock.delivered++
          callback(now)
        })
        window.__residentClock.pending.add(id)
        return id
      }
      window.cancelAnimationFrame = id => { window.__residentClock.pending.delete(id); cancel(id) }
    })
    await page.reload()
    const resident = page.locator('.room-pet')
    await resident.waitFor()
    if (mode === 'sick') assert.match(await resident.getAttribute('aria-label'), /feeling sick/)
    if (mode === 'away') assert.ok(await resident.locator('[data-expression="sleeping"]').count())
    await page.clock.runFor(64)
    const read = () => page.evaluate(() => ({ pending: window.__residentClock.pending.size, delivered: window.__residentClock.delivered }))
    const resting = await read()
    assert.equal(resting.pending, 0)
    await page.clock.runFor(2000)
    assert.deepEqual(await read(), resting, 'settled resident must deliver no idle frames')
    await resident.focus()
    await page.keyboard.press('Enter')
    assert.equal((await read()).pending, 1, 'explicit response must use the single existing clock')
    await page.clock.runFor(mode === 'reduced' ? 1600 : 800)
    assert.equal((await read()).pending, 0, 'response deadline must return to a paused clock')
    assert.ok((await page.locator('.living-room [aria-live="polite"]').textContent()).trim())
    if (mode === 'reduced') {
      await changeReducedMotion(page, 'no-preference')
      assert.equal((await read()).pending, 1)
      await page.clock.runFor(300)
      await changeReducedMotion(page, 'reduce')
      assert.equal((await read()).pending, 0)
      const settled = await read()
      await page.clock.runFor(600)
      assert.deepEqual(await read(), settled)
    }
    t.diagnostic(`Chromium ${page.context().browser().version()}; ${mode}:0 idle frames,1 finite clock,0 after response`)
  })
}
