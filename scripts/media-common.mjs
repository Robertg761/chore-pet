// Shared plumbing for the media scripts (record-demo.mjs, showcase.mjs): serve the
// production build, launch a browser, and read or seed the saved home. Nothing here
// touches the app's source; seeding edits the IndexedDB snapshot the same way
// scripts/browser/helpers.mjs does for the browser tests.
import { preview } from 'vite'
import { chromium } from 'playwright-core'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

export const ROOT = new URL('../', import.meta.url).pathname

/**
 * Serve dist/ (run `npm run build` first) on a free port, with the build's own base path.
 * Set URL to use an app that is already running instead (e.g. `npx vite preview`).
 */
export async function serveApp() {
  if (process.env.URL) return { url: process.env.URL.endsWith('/') ? process.env.URL : `${process.env.URL}/`, close: async () => {} }
  if (!existsSync(`${ROOT}dist/index.html`)) throw new Error('dist/ is missing: run `npm run build` first')
  const html = await readFile(`${ROOT}dist/index.html`, 'utf8')
  const base = html.match(/src="([^"]*)assets\/[^"/]+\.js"/)[1]
  const server = await preview({ configFile: false, root: ROOT, base, preview: { host: '127.0.0.1', port: 0, open: false } })
  const port = server.httpServer.address().port
  return {
    url: `http://127.0.0.1:${port}${base}`,
    close: async () => {
      server.httpServer.closeAllConnections()
      await new Promise((resolve) => server.httpServer.close(resolve))
    },
  }
}

/** CHROME=/path/to/chrome picks a browser binary; otherwise Playwright's own, then installed Chrome. */
export async function launchBrowser() {
  if (process.env.CHROME) return chromium.launch({ executablePath: process.env.CHROME })
  try {
    return await chromium.launch()
  } catch {
    return chromium.launch({ channel: 'chrome' })
  }
}

/** Keep the app on its local, offline data: nothing leaves for Supabase, so a cloud build behaves like a fresh device. */
export async function isolate(context) {
  await context.route(/^https:\/\//, (route) => route.abort())
}

/** The saved home (IndexedDB snapshot), read from a page or a frame. */
export function readSnapshot(target) {
  return target.evaluate(() => new Promise((resolve, reject) => {
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

/**
 * Edit the saved snapshot in place. The edits live inside the one function that runs in the
 * page (the app's CSP forbids building code from strings there), picked by `kind`:
 *  - milestone: { choreCount, unlockedItems, bestStreak }
 *      Put the home at a reward milestone without grinding for it: the chore count becomes
 *      `choreCount` (the difference is banked as `retired`, which the count adds on) and
 *      `unlockedItems` replaces the earned rewards.
 *  - pet: { species, bodyColour, equipped }
 *      Change the pet's species, colour or outfit.
 *  - room: { type, wallStyle, floorStyle, layout: [[catalogId, tileX, tileY, rotation], ...] }
 *      Restyle the first room of that type and set where its things stand (the room's
 *      things are matched by catalog id, so they must already be placed).
 * Reload the page afterwards so the app reads it.
 */
export function editSnapshot(target, kind, arg) {
  return target.evaluate(([kind, arg]) => new Promise((resolve, reject) => {
    // Change a row, and the copy of it waiting in the outbox (if any), so a sync can't undo it.
    const change = (saved, row, patch) => {
      Object.assign(row, patch)
      for (const queued of Object.values(saved.outbox ?? {})) if (queued.value?.id === row.id) Object.assign(queued.value, patch)
    }
    const edits = {
      milestone(saved) {
        const progress = Object.values(saved.tables.progress)[0]
        const live = new Set()
        for (const c of Object.values(saved.tables.completions)) if (c.counts !== false) live.add(`${c.choreId}:${c.completedOn}`)
        progress.retired = { seeded: Math.max(0, arg.choreCount - live.size) }
        progress.unlockedItems = arg.unlockedItems
        progress.bestStreak = Math.max(progress.bestStreak, arg.bestStreak ?? 0)
        const queued = saved.outbox?.[`progress:${progress.homeId}`]
        if (queued) queued.value = progress
      },
      pet(saved) {
        change(saved, Object.values(saved.tables.pets)[0], arg)
      },
      room(saved) {
        const room = Object.values(saved.tables.rooms).find((r) => r.type === arg.type)
        change(saved, room, { wallStyle: arg.wallStyle, floorStyle: arg.floorStyle })
        for (const [catalogId, tileX, tileY, rotation] of arg.layout) {
          const thing = Object.values(saved.tables.placed_objects).find((o) => o.roomId === room.id && o.catalogId === catalogId)
          change(saved, thing, { tileX, tileY, rotation })
        }
      },
    }
    const request = indexedDB.open('chore-pet', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction('kv', 'readwrite')
      const store = tx.objectStore('kv')
      const read = store.get('snapshot')
      read.onsuccess = () => { edits[kind](read.result); store.put(read.result, 'snapshot') }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }), [kind, arg])
}

/** Put the home at a reward milestone: see editSnapshot's "milestone". Reload the page afterwards. */
export const seedMilestone = (target, milestone) => editSnapshot(target, 'milestone', milestone)

export const seedPet = (target, pet) => editSnapshot(target, 'pet', pet)
export const seedRoom = (target, room) => editSnapshot(target, 'room', room)

/** Every reward, in the order it is earned (src/domain/unlocks.ts), as saved in progress.unlockedItems. */
export const ALL_REWARDS = [
  'item:beanie-red', 'decor:teddy', 'wall:mint', 'item:bow', 'decor:lamp', 'floor:tile', 'item:glasses', 'decor:poster',
  'wall:lavender', 'item:scarf', 'decor:fairy-lights', 'item:bow-tie', 'floor:carpet', 'item:backpack', 'item:knit-sweater',
  'item:leaf-crown', 'item:chef-hat', 'wall:sky', 'decor:bookshelf', 'item:heart-glasses', 'floor:seaside', 'item:bandana',
  'decor:wall-clock', 'item:apron', 'decor:bean-bag', 'item:crown',
]
