import test from 'node:test'
import assert from 'node:assert/strict'
import { browserApp, snapshot } from './helpers.mjs'

async function add(page) {
  await page.getByRole('button', { name: 'Add a chore', exact: true }).click()
  await page.getByRole('heading', { name: 'New chore' }).waitFor()
}
async function home(page) {
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await page.getByRole('heading', { name: 'Mochi', exact: true }).waitFor()
}

test('new and existing drafts survive tabs and history; Save and Cancel clear them', async (t) => {
  const page = await browserApp(t, { viewport: { width: 1280, height: 800 } })
  await add(page)
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Clean air filter')
  await home(page)
  await page.goBack()
  await page.getByRole('heading', { name: 'New chore' }).waitFor()
  assert.equal(await page.getByRole('textbox', { name: 'Name', exact: true }).inputValue(), 'Clean air filter')
  await page.goForward()
  await add(page)
  assert.equal(await page.getByRole('textbox', { name: 'Name', exact: true }).inputValue(), 'Clean air filter')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByRole('button', { name: 'Edit Clean air filter', exact: true }).waitFor()
  await add(page)
  assert.equal(await page.getByRole('textbox', { name: 'Name', exact: true }).inputValue(), '')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Edit Wash the dishes', exact: true }).click()
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('A changed chore')
  await home(page)
  await page.getByRole('button', { name: 'Edit Wash the dishes', exact: true }).click()
  assert.equal(await page.getByRole('textbox', { name: 'Name', exact: true }).inputValue(), 'A changed chore')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Edit Wash the dishes', exact: true }).click()
  assert.equal(await page.getByRole('textbox', { name: 'Name', exact: true }).inputValue(), 'Wash the dishes')
  assert.equal(Object.values((await snapshot(page)).tables.chores).filter((c) => c.name === 'Clean air filter').length, 1)
})

test('More and All chores dismiss with Back, menu selection replaces the sheet entry, deep links reload', async (t) => {
  const page = await browserApp(t)
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('dialog', { name: 'More', exact: true }).waitFor()
  await page.goBack()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  await page.goForward()
  await page.getByRole('dialog', { name: 'More', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Your week', exact: true }).click()
  await page.getByRole('heading', { name: 'Your week', exact: true }).waitFor()
  assert.equal(new URL(page.url()).searchParams.get('sheet'), null)
  await page.reload()
  await page.getByRole('heading', { name: 'Your week', exact: true }).waitFor()
  await page.goBack()
  await page.getByRole('heading', { name: 'Mochi', exact: true }).waitFor()
  await page.getByRole('button', { name: /All chores/i }).click()
  await page.getByRole('dialog', { name: 'All chores' }).waitFor()
  await page.goBack()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  await page.goForward()
  await page.getByRole('dialog', { name: 'All chores' }).waitFor()
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
})

test('landing sign-in and cancel do not create a disposable home', async (t) => {
  const page = await browserApp(t)
  const origin = new URL(page.url())
  // A second isolated context represents a returning user on a new device.
  const context = await page.context().browser().newContext()
  t.after(() => context.close())
  await context.route(/^https:\/\//, (route) => route.abort())
  const fresh = await context.newPage()
  await fresh.goto(origin.origin + origin.pathname)
  await fresh.getByRole('button', { name: 'I already have a home' }).click()
  await fresh.getByRole('heading', { name: 'Welcome back' }).waitFor()
  assert.equal(Object.keys((await snapshot(fresh))?.tables.homes ?? {}).length, 0)
  await fresh.getByRole('button', { name: 'Cancel', exact: true }).click()
  await fresh.getByRole('button', { name: 'I already have a home' }).waitFor()
  assert.equal(Object.keys((await snapshot(fresh))?.tables.homes ?? {}).length, 0)
})

test('reload warns about a draft; stale edit deep links never become a new chore', async (t) => {
  const page = await browserApp(t, { viewport: { width: 1280, height: 800 } })
  await add(page)
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Unsaved work')
  let warned = false
  page.once('dialog', async (dialog) => { warned = dialog.type() === 'beforeunload'; await dialog.accept() })
  await page.reload()
  assert.equal(warned, true)
  await page.getByRole('heading', { name: 'New chore' }).waitFor()
  const url = new URL(page.url()); url.searchParams.set('chore', 'deleted-elsewhere')
  await page.goto(url.href)
  await page.getByRole('heading', { name: 'Mochi', exact: true }).waitFor()
  assert.equal(await page.getByRole('heading', { name: 'New chore' }).count(), 0)
})

test('Start over in Settings clears the room and chores, or erases everything', async (t) => {
  const page = await browserApp(t)
  await page.getByRole('button', { name: 'Make it mine', exact: true }).click()
  const settings = async () => {
    await page.getByRole('button', { name: 'More', exact: true }).click()
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor()
  }
  const choose = async (name, confirm) => {
    await page.getByRole('button', { name: 'Start over', exact: true }).click()
    await page.getByRole('group', { name: 'Start over' }).getByRole('button', { name, exact: true }).click()
    if (confirm) await page.getByRole('group', { name }).getByRole('button', { name: confirm, exact: true }).click()
  }
  await settings()
  await choose('Keep my home')
  // Each choice asks again, and Back returns to the choices; the safe button has focus.
  await page.getByRole('button', { name: 'Start over', exact: true }).click()
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Keep my home')
  await page.getByRole('button', { name: 'Clear room and chores', exact: true }).click()
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Back')
  await page.getByRole('button', { name: 'Back', exact: true }).last().click()
  await page.getByRole('button', { name: 'Keep my home', exact: true }).click()
  assert.equal(Object.keys((await snapshot(page)).tables.homes).length, 1)

  // A move: the pet and rewards stay, the room and chore list are empty, past work is kept.
  const before = (await snapshot(page)).tables
  await choose('Clear room and chores', 'Clear')
  await page.getByRole('button', { name: 'Build your room', exact: true }).waitFor()
  await page.getByText('No chores yet', { exact: false }).waitFor()
  let { tables } = await snapshot(page)
  assert.deepEqual(tables.placed_objects, {})
  assert.ok(Object.values(tables.chores).every((c) => c.archivedOn))
  assert.equal(Object.keys(tables.completions).length, Object.keys(before.completions).length)
  assert.deepEqual(tables.pets, before.pets)
  assert.deepEqual(tables.progress, before.progress)

  await settings()
  await choose('Erase everything', 'Erase')
  await page.getByRole('button', { name: 'Try a sample home' }).waitFor()
  ;({ tables } = await snapshot(page))
  for (const table of ['homes', 'rooms', 'placed_objects', 'chores', 'pets']) assert.deepEqual(tables[table], {}, table)
  assert.equal(new URL(page.url()).searchParams.get('screen'), null)
})

test('the sample home has no Start over; Start fresh is its way out', async (t) => {
  const page = await browserApp(t)
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Start over', exact: true }).count(), 0)
})

test('the Chores screen edits, removes several at once and adds a removed chore back', async (t) => {
  const page = await browserApp(t, { reducedMotion: 'no-preference' })
  await page.getByRole('button', { name: 'Make it mine', exact: true }).click()
  const active = async () => Object.values((await snapshot(page)).tables.chores).filter((c) => !c.archivedOn).map((c) => c.name).sort()
  const before = await active()
  // From the full list's Manage button.
  await page.getByRole('button', { name: /^All/ }).click()
  await page.getByRole('dialog', { name: 'All chores' }).getByRole('button', { name: 'Manage', exact: true }).click()
  await page.getByRole('heading', { name: 'Chores', exact: true }).waitFor()
  assert.equal(new URL(page.url()).searchParams.get('screen'), 'chores')

  // Editing returns here, not home.
  await page.getByRole('button', { name: 'Edit Wash the dishes', exact: true }).click()
  await page.getByRole('heading', { name: 'Edit chore' }).waitFor()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('heading', { name: 'Chores', exact: true }).waitFor()

  // Deleting from an editor opened here lands back here, with no home entry slipped in between.
  await page.getByRole('button', { name: 'Edit Wipe the table', exact: true }).click()
  await page.getByRole('heading', { name: 'Edit chore' }).waitFor()
  await page.getByRole('button', { name: 'Delete chore' }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('heading', { name: 'Chores', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Add Wipe the table again', exact: true }).waitFor()
  assert.equal(new URL(page.url()).searchParams.get('screen'), 'chores')
  await page.goBack()
  await page.getByRole('heading', { name: 'Chores', exact: true }).waitFor()
  assert.equal(new URL(page.url()).searchParams.get('screen'), 'chores')
  await page.getByRole('button', { name: 'Add Wipe the table again', exact: true }).click()
  await page.getByRole('checkbox', { name: /Wipe the table/ }).waitFor()

  // Unpicking while asked goes back a step: a new pick never lands on the Remove question.
  await page.getByRole('checkbox', { name: /Wash the dishes/ }).check()
  await page.getByRole('button', { name: 'Remove 1 chore', exact: true }).click()
  await page.getByRole('checkbox', { name: /Wash the dishes/ }).uncheck()
  await page.getByRole('checkbox', { name: /Wash the dishes/ }).check()
  assert.equal(await page.getByRole('group', { name: 'Remove chores' }).count(), 0)
  await page.getByRole('button', { name: 'Clear picks', exact: true }).click()

  // Pick two, think better of it, then remove them.
  await page.getByRole('checkbox', { name: /Wash the dishes/ }).check()
  await page.getByRole('checkbox', { name: /Take out the trash/ }).check()
  await page.getByRole('button', { name: 'Remove 2 chores', exact: true }).click()
  await page.getByRole('group', { name: 'Remove chores' }).getByRole('button', { name: 'Keep them', exact: true }).click()
  assert.deepEqual(await active(), before)
  await page.getByRole('button', { name: 'Remove 2 chores', exact: true }).click()
  await page.getByRole('group', { name: 'Remove chores' }).getByRole('button', { name: 'Remove', exact: true }).click()
  await page.getByRole('button', { name: 'Add Wash the dishes again', exact: true }).waitFor()
  assert.deepEqual(await active(), before.filter((n) => n !== 'Wash the dishes' && n !== 'Take out the trash'))

  // Add one back: it's on the list again and gone from the removed list.
  await page.getByRole('button', { name: 'Add Wash the dishes again', exact: true }).click()
  await page.getByRole('checkbox', { name: /Wash the dishes/ }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Add Wash the dishes again', exact: true }).count(), 0)
  assert.deepEqual(await active(), before.filter((n) => n !== 'Take out the trash'))

  // Adding from here comes back here; reload keeps the screen.
  await page.getByRole('button', { name: 'Add a chore', exact: true }).click()
  await page.getByRole('heading', { name: 'New chore' }).waitFor()
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Water the herbs')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByRole('checkbox', { name: /Water the herbs/ }).waitFor()
  await page.reload()
  await page.getByRole('heading', { name: 'Chores', exact: true }).waitFor()
  // It's in the More menu too.
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('button', { name: 'Chores', exact: true }).click()
  await page.getByRole('heading', { name: 'Chores', exact: true }).waitFor()
})

test('a chore dated ahead by a clock can be edited and removed from the Chores screen', async (t) => {
  const page = await browserApp(t)
  await page.getByRole('button', { name: 'Make it mine', exact: true }).click()
  // Date one chore well ahead, as a device clock set forward would.
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
        const chore = Object.values(saved.tables.chores).find((c) => c.name === 'Wipe the table')
        chore.createdOn = '2999-01-01'
        store.put(saved, 'snapshot')
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }))
  await page.goto(page.url().replace(/\?.*$/, '') + '?screen=chores')
  await page.getByRole('button', { name: 'Edit Wipe the table', exact: true }).click()
  await page.getByRole('heading', { name: 'Edit chore' }).waitFor()
  assert.equal(new URL(page.url()).searchParams.get('screen'), 'edit')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('checkbox', { name: /Wipe the table/ }).check()
  await page.getByRole('button', { name: 'Remove 1 chore', exact: true }).click()
  await page.getByRole('group', { name: 'Remove chores' }).getByRole('button', { name: 'Remove', exact: true }).click()
  await page.getByRole('button', { name: 'Add Wipe the table again', exact: true }).waitFor()
  assert.equal(await page.getByRole('checkbox', { name: /Wipe the table/ }).count(), 0)
})
