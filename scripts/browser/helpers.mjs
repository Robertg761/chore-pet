import { preview } from 'vite'
import { chromium } from 'playwright-core'
import { readFile } from 'node:fs/promises'

// Use the production artifact, including its actual deployment base path.
export async function browserApp(t, options = {}) {
  const html = await readFile(new URL('../../dist/index.html', import.meta.url), 'utf8')
  const base = html.match(/src="([^"]*)assets\/[^"/]+\.js"/)[1]
  const server = await preview({ configFile: false, base, preview: { host: '127.0.0.1', port: 0, open: false } })
  let browser
  t.after(async () => {
    await browser?.close()
    server.httpServer.closeAllConnections()
    await new Promise((resolve) => server.httpServer.close(resolve))
  })
  browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {})
  const context = await browser.newContext({ viewport: { width: 390, height: 664 }, reducedMotion: 'reduce', serviceWorkers: 'block', ...options })
  const page = await context.newPage()
  page.setDefaultTimeout(4000)
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  t.after(() => { if (errors.length) throw new Error(errors.join('\n')) })
  // UI regressions run with local data even when CI builds a configured cloud app.
  // A regex also matches nested API paths; the string glob https://** does not.
  await context.route(/^https:\/\//, (route) => route.abort())
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}${base}`)
  await page.getByRole('button', { name: 'Try a sample home' }).click()
  return page
}

export async function snapshot(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('chore-pet', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const read = db.transaction('kv').objectStore('kv').get('snapshot')
      read.onsuccess = () => { db.close(); resolve(read.result) }
      read.onerror = () => { db.close(); reject(read.error) }
    }
  }))
}

// A saved-home fixture for reward thresholds; no runtime hooks in the app.
export async function seedProgress(page, patch) {
  await page.evaluate((patch) => new Promise((resolve, reject) => {
    const request = indexedDB.open('chore-pet', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction('kv', 'readwrite')
      const store = tx.objectStore('kv')
      const read = store.get('snapshot')
      read.onsuccess = () => {
        const saved = read.result
        const progress = Object.values(saved.tables.progress)[0]
        Object.assign(progress, patch)
        const queued = saved.outbox[`progress:${progress.homeId}`]
        if (queued) queued.value = progress
        store.put(saved, 'snapshot')
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }), patch)
  await page.reload()
}

// Two real completions yesterday; the next one earns decor and a streak style.
export async function seedCompletionMilestones(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('chore-pet', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction('kv', 'readwrite')
      const store = tx.objectStore('kv')
      const read = store.get('snapshot')
      read.onsuccess = () => {
        const saved = read.result
        const previous = new Date()
        previous.setDate(previous.getDate() - 1)
        const day = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}-${String(previous.getDate()).padStart(2, '0')}`
        const chores = Object.values(saved.tables.chores)
        const dishes = chores.find(c => c.name === 'Wash the dishes')
        const other = chores.find(c => c.id !== dishes.id)
        for (const chore of chores) chore.archivedOn = chore.createdOn
        saved.tables.completions = {}
        for (const chore of [dishes, other]) {
          delete chore.archivedOn
          chore.createdOn = day
          chore.schedule = { kind: 'daily' }
          saved.tables.completions[chore.id] = { id: chore.id, choreId: chore.id, completedOn: day, completedAt: previous.toISOString(), counts: true }
        }
        const progress = Object.values(saved.tables.progress)[0]
        Object.assign(progress, { choreCount: 2, currentStreak: 1, bestStreak: 1, unlockedItems: ['item:beanie-red'] })
        saved.outbox = {}
        store.put(saved, 'snapshot')
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }))
  await page.reload()
}
