import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { catalogEntry } from './catalog/objects'
import { canSkip, choreActiveOn, choreRetiredBy, choreStatus, skippedOn } from './domain/schedule'
import type { CatalogEntry } from './catalog/types'
import { CharacterArt } from './character/Character'
import { isInVacation } from './domain/dates'
import { petCondition } from './domain/health'
import { messStageFor, objectNeglect } from './domain/mess'
import type { Chore } from './domain/types'
import { currentStreak, type Unlock } from './domain/unlocks'
import { ITEMS } from './character/items'
import {
  addChore,
  addChoreAgain,
  adoptSample,
  clearHome,
  completeChoreWithRewards,
  skipChore,
  skipDayFor,
  uncompleteChore,
  unskipChore,
  updatePet,
  updateRoom,
  createHousehold,
  createRoom,
  moveObject,
  placeObject,
  reconcileProgress,
  removeChore,
  removeHome,
  removeObject,
  removeRoom,
  setVacations,
  updateChore,
} from './data/actions'
import { appStore, startAppStore, useDataState, useHome } from './data/appStore'
import { selectHome } from './data/state'
import type { SyncStatus } from './data/store'
import { devNow } from './lib/devClock'
import { useToday } from './lib/useToday'
import { SAMPLE_HOME_NAME, sampleHome } from './content/sampleHome'
import { useInstallPrompt } from './pwa/useInstallPrompt'
import { BuildRoom, type BuildChange } from './room/BuildRoom'
import { Sparkle } from './effects'
import { checkPlacement, footprintOf, freeTile, turned } from './room/grid'
import { lookup } from './room/placement'
import { LivingRoom, type Celebration } from './pet/LivingRoom'
import { CatalogTray } from './screens/CatalogTray'
import { CharacterCreator } from './screens/CharacterCreator'
import { ChoreEditor } from './screens/ChoreEditor'
import { ChoreList } from './screens/ChoreList'
import { ManageChores } from './screens/ManageChores'
import { againInput } from './screens/manageModel'
import { RoomPill, RoomsSheet } from './screens/RoomsSheet'
import { currentRoom, lateByRoom, orderRooms, placesAcrossRooms, roomNames } from './screens/roomsModel'
import { sparkleSpot, type SparkleSpot } from './screens/doneMoment'
import { HealthBar } from './screens/HealthBar'
import { AccountCleanup } from './screens/AccountCleanup'
import { Landing } from './screens/Landing'
import { GiftBox } from './screens/GiftBox'
import { ObjectSheet } from './screens/ObjectSheet'
import { PetPicker } from './screens/PetPicker'
import { RewardsScreen } from './screens/RewardsScreen'
import { rewardsNote } from './screens/rewardsModel'
import { SampleBanner } from './screens/SampleBanner'
import { CoachCard, FirstDoneHint, Welcome } from './screens/Onboarding'
import { coachStep, hasDueChore, hintKey, onboardedKey, readFlag, showFirstDoneHint, writeFlag } from './screens/onboardingModel'
import { RoomStylePicker } from './screens/RoomStylePicker'
import { VacationScreen } from './screens/VacationScreen'
import { Wardrobe } from './screens/Wardrobe'
import { WeekView } from './screens/WeekView'
import { SettingsScreen } from './screens/SettingsScreen'
import { ShareCard } from './screens/ShareCard'
import { play } from './audio/sfx'
import { useReminders } from './reminders/reminders'
import { AppNav, type MoreItem, type Tab } from './shell/AppNav'
import { objectOverdue } from './room/cuePlan'
import { PET_STROKE_SCALE } from './room/shell/geometry'
import { Sheet } from './shell/Sheet'
import { UndoToast } from './shell/UndoToast'
import { withViewTransition } from './shell/viewTransition'
import { ROOM_ASPECT_VARS, upNextRows } from './shell/layout'
import { useViewport, useWide } from './shell/useViewport'
import { useNavigation } from './shell/useNavigation'
import type { View } from './shell/navigation'
import { ChoreDraftContext, useChoreDrafts } from './screens/choreDrafts'
import { AccountSection } from './screens/AccountSection'
import { ScreenHeader } from './shell/ScreenHeader'

/** Where each screen sits, left to right: the tabs in their order, then the screens opened from them. */
/** localStorage key for the room on show (by id; a room from another home just isn't found). */
const PICKED_ROOM_KEY = 'chore-pet:room'

const VIEW_RANK: Record<View['name'], number> = { home: 0, build: 1, wardrobe: 2, rewards: 3, edit: 6, chores: 5, week: 5, creator: 5, share: 5, vacation: 5, settings: 5, 'sign-in': 5, 'pick-pet': 1 }

/** How long the gift waits after Done, so the cheer, sparkle and health float play first. */
const GIFT_DELAY_MS = 1400

/** The browser tab's title per screen. */
const VIEW_TITLE: Record<View['name'], string> = {
  home: 'Chore Pet',
  build: 'Build · Chore Pet',
  edit: 'Edit chore · Chore Pet',
  chores: 'Chores · Chore Pet',
  vacation: 'Vacation mode · Chore Pet',
  rewards: 'Rewards · Chore Pet',
  week: 'Your week · Chore Pet',
  creator: 'Change look · Chore Pet',
  wardrobe: 'Wardrobe · Chore Pet',
  share: 'Share your home · Chore Pet',
  settings: 'Settings · Chore Pet',
  'sign-in': 'Sign in · Chore Pet',
  'pick-pet': 'Choose your pet · Chore Pet',
}

const SYNC_LABEL: Record<SyncStatus, string> = {
  'local-only': 'Saved on this device',
  offline: 'Offline, saved on this device',
  syncing: 'Syncing',
  synced: 'Synced',
  error: 'Will sync when it can',
}

export default function App() {
  useEffect(startAppStore, [])
  const { ready, hydrated, sync, snapshot, savedLocally, lastError } = useDataState()
  const data = useHome()
  const today = useToday()
  // Hydration, sync, edits and midnight can earn rewards without another tap.
  // Read fresh state so StrictMode's repeated effect cannot queue the same write.
  useEffect(() => {
    const state = appStore.getState()
    if (!state.ready || !state.hydrated) return
    const history = selectHome(state.snapshot.tables, state.snapshot.activeHomeId)
    if (!history.home) return
    const { ops } = reconcileProgress(state.snapshot.tables.progress[history.home.id] ?? null,
      { chores: history.chores, completions: history.completions, vacations: history.home.vacations }, today)
    if (ops.length) appStore.apply(...ops)
  }, [ready, hydrated, snapshot.tables, snapshot.activeHomeId, today])
  const scope = JSON.stringify([snapshot.userId, data.home?.id ?? null])
  const { route, navigation } = useNavigation(ready && hydrated ? scope : null)
  const view = route
  const setViewNow = (next: View) => navigation.go(next)
  const drafts = useChoreDrafts(scope, data.chores, data.objects)
  /** Change screen with a short slide: forward when going deeper (to the right), back when returning. */
  const setView = (next: View) => {
    // The undo is for a slip on the home screen; it doesn't follow the player to another screen.
    if (next.name !== 'home') setUndo(null)
    const step = VIEW_RANK[next.name] - VIEW_RANK[view.name]
    if (next.name === view.name) setViewNow(next)
    else withViewTransition(() => setViewNow(next), step > 0 ? 'forward' : step < 0 ? 'back' : 'fade')
  }
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [placing, setPlacing] = useState<CatalogEntry | null>(null)
  // First launch: the landing choice, or the picker once "Build my home" is tapped.
  const building = view.name === 'pick-pet'
  const setBuilding = (value: boolean) => setView({ name: value ? 'pick-pet' : 'home' })
  // First run: the welcome beat after "Move in", then the coach card while building the first room.
  const [welcome, setWelcome] = useState(false)
  const [coachHome, setCoachHome] = useState<string | null>(null)
  const [, setFlagTick] = useState(0)
  const { canInstall, install } = useInstallPrompt()
  // The completion moment: the pet cheers and each cleaned object gets its own sparkle.
  const [celebrate, setCelebrate] = useState<Celebration | null>(null)
  const [sparkles, setSparkles] = useState<(SparkleSpot & { id: number })[]>([])
  const [gifts, setGifts] = useState<Unlock[]>([])
  // Back/Forward follows the URL and dismisses transient feedback. Gift
  // shortcuts use app navigation directly and preserve the remaining queue.
  const historyRevision = useRef(0)
  useEffect(() => {
    const dismissGifts = () => {
      historyRevision.current++
      setGifts([])
    }
    window.addEventListener('popstate', dismissGifts)
    return () => window.removeEventListener('popstate', dismissGifts)
  }, [])
  // The last chore ticked off (or skipped), for a few seconds, so a slip can be undone.
  const [undo, setUndo] = useState<
    ({ key: number; choreName: string } & ({ kind: 'done'; completionId: string } | { kind: 'skip'; choreId: string; day: string })) | null
  >(null)
  const currentScope = useRef(scope)
  useLayoutEffect(() => { currentScope.current = scope }, [scope])
  const [momentScope, setMomentScope] = useState(scope)
  if (momentScope !== scope) {
    setMomentScope(scope)
    setSelectedId(null)
    setGifts([])
    setUndo(null)
    setCelebrate(null)
    setSparkles([])
    setPlacing(null)
  }
  const momentKey = useRef(0)
  const doneRef = useRef<HTMLButtonElement>(null)
  const viewport = useViewport()
  const wide = useWide()
  // A chore being edited that no longer exists (deleted on another device) sends the editor home.
  // Any chore still on the list can be edited, including one dated to start later (a clock set ahead).
  const missingEdit = view.name === 'edit' && view.choreId !== undefined && !data.chores.some((c) => c.id === view.choreId && !choreRetiredBy(c, today))
  const staleEdit = ready && hydrated && missingEdit
  useEffect(() => {
    // Back to where the editor was opened from: deleting from the chores screen lands there, not home.
    if (staleEdit) navigation.go(view.name === 'edit' && view.from === 'chores' ? { name: 'chores' } : { name: 'home' }, true)
    else if (data.home && (view.name === 'sign-in' || view.name === 'pick-pet')) navigation.go({ name: 'home' }, true)
  }, [staleEdit, data.home, view, navigation])
  const focusHomeHeading = useRef(false)
  const focusHeading = (heading: HTMLElement | null) => {
    if (!heading) return
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  }
  // Each screen names itself and takes focus at its heading, so keyboard and screen-reader users land on it.
  useEffect(() => {
    document.title = VIEW_TITLE[view.name]
    if (view.name === 'home') {
      // Back from a skip, the chore's row has moved on: start from the top of home rather than nowhere.
      if (focusHomeHeading.current) focusHeading(document.querySelector<HTMLElement>('.app-view h1'))
      focusHomeHeading.current = false
      return
    }
    focusHeading(document.querySelector<HTMLElement>('.app-view h1, .shell.screen h1'))
  }, [view.name])
  // Into the sample home from the landing: focus starts at the top of home rather than nowhere.
  const homeId = data.home?.id
  useEffect(() => {
    if (!homeId || !focusHomeHeading.current) return
    focusHomeHeading.current = false
    requestAnimationFrame(() => focusHeading(document.querySelector<HTMLElement>('.app-view h1')))
  }, [homeId])
  const allChores = route.sheet === 'all'
  const setAllChores = (open: boolean) => navigation.go({ ...view, sheet: open ? 'all' : undefined }, !open)
  const [buildPanel, setBuildPanel] = useState<'things' | 'style'>('things')
  // The room on show, remembered on this device; a room that's gone falls back to the first.
  const [pickedRoom, setPickedRoom] = useState<string | null>(() => {
    try { return localStorage.getItem(PICKED_ROOM_KEY) } catch { return null }
  })
  const pickRoom = (id: string) => {
    setPickedRoom(id)
    try { localStorage.setItem(PICKED_ROOM_KEY, id) } catch { /* private window: just for this visit */ }
  }

  // The pet's daily nudge (while the app is open); needs the same view of the day as the screen.
  const reminderStatuses = data.home ? petCondition(data.chores, data.completions, today, data.home.vacations).statuses : []
  useReminders(
    data.home && data.pet
      ? { pet: data.pet, chores: data.chores, statuses: reminderStatuses, today, away: isInVacation(today, data.home.vacations) }
      : null,
  )

  // The streak shown beside the health bar, replayed only when the history or the day changes.
  const homeStreak = useMemo(
    () => (data.home ? currentStreak(data.chores, data.completions, today, data.home.vacations) : 0),
    [data.home, data.chores, data.completions, today],
  )
  // Homes made before rooms existed get their first room.
  const needsRoom = Boolean(data.home && data.rooms.length === 0)
  useEffect(() => {
    if (needsRoom && data.home) appStore.apply(...createRoom(data.home))
  }, [needsRoom, data.home])

  if (!ready) return <main className="shell" aria-busy="true" />
  if (snapshot.cleanup) return <AccountCleanup cleanup={snapshot.cleanup} />
  // Signed in on a new device: wait for the saved home rather than offering a fresh one.
  if (!data.home && !hydrated) {
    return (
      <main className="shell" aria-busy={!lastError}>
        <p className="dev-note" role="status">
          {lastError ? "Couldn't reach your saved home yet." : 'Finding your home…'}
        </p>
        {lastError && (
          <button type="button" className="link-button" onClick={() => void appStore.sync()}>
            Try again
          </button>
        )}
      </main>
    )
  }

  if (!data.home || !data.pet) {
    if (view.name === 'sign-in') return (
      <main className="shell screen">
        <ScreenHeader title="Welcome back" onBack={() => navigation.go({ name: 'home' })} backLabel="Cancel" />
        <AccountSection entry />
      </main>
    )
    return (
      <main className="shell">
        {building ? (
          <>
            <PetPicker
              onBack={() => setBuilding(false)}
              onChoose={({ species, name }) => {
                setWelcome(true)
                appStore.apply(...createHousehold({ species, petName: name, userId: snapshot.userId }))
              }}
            />
          </>
        ) : (
          <Landing
            onSample={(species) => ((focusHomeHeading.current = true), appStore.apply(...sampleHome({ species, userId: snapshot.userId, today })))}
            onBuild={() => setBuilding(true)}
            onSignIn={() => setView({ name: 'sign-in' })}
          />
        )}
      </main>
    )
  }

  const { home, pet, progress, rooms, objects, chores, completions } = data
  const activeChores = chores.filter((c) => choreActiveOn(c, today))
  const orderedRooms = orderRooms(rooms)
  const room = currentRoom(orderedRooms, pickedRoom)
  const roomObjects = room ? objects.filter((o) => o.roomId === room.id) : []
  const names = roomNames(orderedRooms)
  // Chores can belong to anything in the home, named with their room once there are several.
  const places = placesAcrossRooms(orderedRooms, objects)
  const back = () => setView({ name: 'home' })
  const flag = (key: string) => (writeFlag(key), setFlagTick((n) => n + 1))
  // Build mode for the first time shows the coach card; it stays for this visit once started.
  const openBuild = () => {
    if (!readFlag(onboardedKey(home.id)) && !objects.some((o) => o.roomId === room?.id)) setCoachHome(home.id)
    setView({ name: 'build' })
  }

  if (welcome) {
    return (
      <main className="shell">
        <Welcome
          pet={pet}
          onContinue={() => {
            setWelcome(false)
            openBuild()
          }}
        />
      </main>
    )
  }

  const syncNote = savedLocally || sync === 'synced' ? SYNC_LABEL[sync] : null
  const more: MoreItem[] = [
    { label: 'Chores', onSelect: () => setView({ name: 'chores' }) },
    { label: 'Your week', onSelect: () => setView({ name: 'week' }) },
    { label: 'Change look', onSelect: () => setView({ name: 'creator' }) },
    { label: 'Share your home', onSelect: () => setView({ name: 'share' }) },
    { label: 'Vacation mode', onSelect: () => setView({ name: 'vacation' }) },
    { label: 'Settings', onSelect: () => setView({ name: 'settings' }) },
    ...(canInstall ? [{ label: 'Add to home screen', onSelect: () => { navigation.go({ ...view, sheet: undefined }, true); void install() } }] : []),
  ]
  // On a phone's home screen the toast takes the place of the buttons under the list, so it covers nothing.
  const toastInHomeList = view.name === 'home' && !wide && !allChores && !gifts.length
  const undoToast = undo && (
    <UndoToast
      key={undo.key}
      choreName={undo.choreName}
      verb={undo.kind === 'skip' ? 'Skipped' : 'Done'}
      paused={gifts.length > 0}
      inline={gifts.length > 0 || (view.name === 'home' && allChores) || toastInHomeList}
      onUndo={() => {
        if (undo.kind === 'skip') {
          // Looked up fresh: the chore may have changed (or gone) since.
          const chore = chores.find((c) => c.id === undo.choreId)
          if (chore) appStore.apply(...unskipChore(chore, undo.day))
        } else {
          // Any gift that tap earned stays: rewards are never taken back.
          appStore.apply(...uncompleteChore(undo.completionId, progress, completions))
        }
        setUndo(null)
      }}
      onClose={() => setUndo(null)}
    />
  )

  /** A screen inside the app frame: the tabs along the bottom (phones) or down the left (wide). */
  const framed = (active: Tab, content: ReactNode) => (
    <ChoreDraftContext value={drafts}>
    <div className="app">
      <div className="app-view">{content}</div>
      <AppNav
        active={active}
        menuOpen={route.sheet === 'more'}
        onMenuChange={(open) => open ? navigation.go({ ...view, sheet: 'more' }) : navigation.dismiss()}
        onNavigate={(tab) => (setSelectedId(null), setPlacing(null), tab === 'build' ? openBuild() : setView({ name: tab } as View))}
        rewardsNote={rewardsNote(progress)}
        more={more}
        note={syncNote ?? undefined}
      />
      {!gifts.length && !(view.name === 'home' && allChores) && !toastInHomeList && undoToast}
      {gifts[0] && (
        <GiftBox
          key={gifts[0].id}
          unlock={gifts[0]}
          pet={pet}
          onPlace={() => {
            const entry = catalogEntry(gifts[0].ref)
            setSelectedId(null)
            setBuildPanel('things')
            openBuild()
            if (entry) setPlacing(entry)
          }}
          onTry={() => {
            const unlock = gifts[0]
            if (room) appStore.apply(...updateRoom(room, unlock.kind === 'wall' ? { wallStyle: unlock.ref } : { floorStyle: unlock.ref }))
            setBuildPanel('style')
            openBuild()
          }}
          onClose={({ wear }) => {
            const item = ITEMS.find((i) => i.id === gifts[0].ref)
            if (wear && gifts[0].kind === 'item' && item) appStore.apply(...updatePet(pet, { equipped: { ...pet.equipped, [item.slot]: item.id } }))
            setGifts((queue) => queue.slice(1))
          }}
        >
          {undoToast}
        </GiftBox>
      )}
    </div>
    </ChoreDraftContext>
  )

  if (missingEdit) return framed('home', <main className="shell"><p role="status">{hydrated ? 'That chore is no longer here.' : 'Finding your chore…'}</p></main>)

  if (view.name === 'edit') {
    // Looked up fresh each render: a chore deleted elsewhere (another device, a sync) is never written back.
    const chore = view.choreId ? chores.find((c) => c.id === view.choreId && !choreRetiredBy(c, today)) : undefined
    // Places a chore can belong to, named like the catalog; duplicates are numbered ("Rug 2").
    // Opened from the chores screen, the editor goes back there.
    const done = () => (view.from === 'chores' ? setView({ name: 'chores' }) : back())
    return framed(
      'home',
      <main className="shell screen">
        <ChoreEditor
          key={view.choreId ?? 'new'}
          chore={chore}
          places={places}
          onSave={(value) => {
            appStore.apply(...(chore ? updateChore(chore, value, today) : addChore(home, value, today)))
            done()
          }}
          onDelete={
            chore &&
            (() => {
              appStore.apply(...removeChore(chore.id, data, today))
              done()
            })
          }
          onSkip={
            chore && canSkip(choreStatus(chore, completions, today, home.vacations))
              ? () => {
                  const day = skipDayFor(today)
                  appStore.apply(...skipChore(chore, day))
                  setUndo({ key: ++momentKey.current, kind: 'skip', choreId: chore.id, day, choreName: chore.name })
                  focusHomeHeading.current = view.from !== 'chores'
                  done()
                }
              : undefined
          }
          onUnskip={chore && skippedOn(chore, today) ? () => (appStore.apply(...unskipChore(chore, today)), done()) : undefined}
          onCancel={done}
        />
      </main>,
    )
  }

  if (view.name === 'chores') {
    return framed(
      'more',
      <main className="shell screen">
        <ManageChores
          chores={chores}
          objects={objects}
          places={places}
          today={today}
          onEdit={(chore) => setView({ name: 'edit', choreId: chore.id, from: 'chores' })}
          onAdd={() => setView({ name: 'edit', from: 'chores' })}
          onRemove={(list) => appStore.apply(...list.flatMap((c) => removeChore(c.id, data, today)))}
          onAddAgain={(chore) => appStore.apply(...addChoreAgain(home, chore, againInput(chore, objects), completions, today))}
          onClose={back}
        />
      </main>,
    )
  }

  if (view.name === 'vacation') {
    return framed(
      'more',
      <main className="shell screen">
        <VacationScreen vacations={home.vacations} today={today} onChange={(v) => appStore.apply(...setVacations(home, v))} onClose={back} />
      </main>,
    )
  }

  if (view.name === 'settings') {
    return framed(
      'more',
      <main className="shell screen">
        <SettingsScreen
          petName={pet.name}
          homeId={home.id}
          onClose={back}
          // The sample home has its own Start fresh, and nothing of the player's to clear.
          onStartOver={home.name === SAMPLE_HOME_NAME ? undefined : () => (navigation.go({ name: 'home' }, true), appStore.apply(...removeHome(home.id)))}
          rooms={orderedRooms.length}
          onClearRoom={() => (navigation.go({ name: 'home' }, true), appStore.apply(...clearHome({ ...data, home }, today)))}
          otherHomes={Object.keys(snapshot.tables.homes).filter((id) => id !== home.id).length}
        />
      </main>,
    )
  }

  if (view.name === 'share' && room) {
    return framed(
      'more',
      <main className="shell screen">
        <ShareCard
          pet={pet}
          room={room}
          objects={roomObjects}
          choreCount={progress?.choreCount ?? 0}
          // Worked out for the displayed day, like the rewards screen.
          streak={currentStreak(chores, completions, today, home.vacations)}
          onClose={back}
        />
      </main>,
    )
  }

  if (view.name === 'creator') {
    return framed(
      'more',
      <main className="shell screen">
        <CharacterCreator pet={pet} onSave={(patch) => appStore.apply(...updatePet(pet, patch))} onClose={back} />
      </main>,
    )
  }

  if (view.name === 'wardrobe') {
    return framed(
      'wardrobe',
      <main className="shell screen">
        <Wardrobe pet={pet} progress={progress} onChange={(patch) => appStore.apply(...updatePet(pet, patch))} />
      </main>,
    )
  }

  if (view.name === 'week') {
    return framed(
      'more',
      <main className="shell screen">
        <WeekView chores={chores} completions={completions} vacations={home.vacations} today={today} onClose={back} />
      </main>,
    )
  }

  if (view.name === 'rewards') {
    return framed(
      'rewards',
      <main className="shell screen">
        <RewardsScreen
          pet={pet}
          progress={progress}
          chores={chores}
          completions={completions}
          vacations={home.vacations}
          today={today}
          onEquip={(equipped) => appStore.apply(...updatePet(pet, { equipped }))}
        />
      </main>,
    )
  }

  const condition = petCondition(chores, completions, today, home.vacations)
  const away = isInVacation(today, home.vacations)
  const neglect = objectNeglect(chores, condition.statuses)
  const stages = Object.fromEntries(Object.entries(neglect).map(([id, level]) => [id, messStageFor(level)]))
  // Rooms: a pill over the room picture names the one on show (and counts what's late in the others);
  // it opens a sheet to switch, add or remove rooms.
  const late = lateByRoom(objects, chores, condition.statuses)
  const lateElsewhere = [...late].reduce((n, [id, count]) => (id === room?.id ? n : n + count), 0)
  const roomPill = room && (
    <RoomPill name={names.get(room.id) ?? 'Room'} lateElsewhere={lateElsewhere} onOpen={() => navigation.go({ ...view, sheet: 'rooms' })} />
  )
  const roomsSheet = route.sheet === 'rooms' && room && (
    <Sheet title="Your rooms" onClose={() => navigation.dismiss()}>
      <RoomsSheet
        rooms={orderedRooms}
        names={names}
        currentId={room.id}
        things={new Map(orderedRooms.map((r) => [r.id, objects.filter((o) => o.roomId === r.id).length]))}
        late={late}
        onPick={(id) => (pickRoom(id), setSelectedId(null), setPlacing(null), navigation.dismiss())}
        onAdd={(type) => {
          const ops = createRoom(home, type)
          appStore.apply(...ops)
          pickRoom(ops[0].key)
          setSelectedId(null)
          setPlacing(null)
          // A new room is empty: straight into building it.
          navigation.go({ name: 'build' }, true)
        }}
        onRemove={(id) => {
          const gone = orderedRooms.find((r) => r.id === id)
          // A home always keeps one room.
          if (!gone || orderedRooms.length < 2) return
          // Removing the room on show shows the first one left.
          if (id === room.id) pickRoom(orderedRooms.find((r) => r.id !== id)!.id)
          // Nothing stays selected or mid-placement in a room that's gone.
          setSelectedId(null)
          setPlacing(null)
          appStore.apply(...removeRoom(gone, objects, today))
        }}
      />
    </Sheet>
  )
  const solid = roomObjects.flatMap((o) => {
    const e = catalogEntry(o.catalogId)
    return e && e.layer === 'solid' ? [footprintOf(o, e)] : []
  })
  const petTile = freeTile(solid)
  const petInRoom = petTile && {
    tile: petTile,
    art: <CharacterArt species={pet.species} mood={condition.mood} pose={away ? 'sleeping' : undefined} bodyColour={pet.bodyColour} equipped={pet.equipped} look={{ eyes: pet.eyes, cheeks: pet.cheeks }} strokeScale={PET_STROKE_SCALE} />,
  }

  if (view.name === 'build' && room) {
    const selected = roomObjects.find((o) => o.id === selectedId) ?? null
    const selectedEntry = selected ? catalogEntry(selected.catalogId) : undefined
    const coaching = coachHome === home.id && !readFlag(onboardedKey(home.id))
    const commit = (change: BuildChange) => {
      if (change.kind === 'add') {
        // Select what was just placed so its sheet shows the chores it brought.
        const ops = placeObject(room, change.entry, change.placement, today)
        appStore.apply(...ops)
        // While coaching, keep the tray open so the next pick is one tap away.
        if (!coaching) setSelectedId(ops[0].key)
      }
      else {
        const obj = roomObjects.find((o) => o.id === change.id)
        if (obj) appStore.apply(...moveObject(obj, change.placement))
      }
    }
    const step = coachStep(roomObjects.length)
    const finishCoach = () => {
      setCoachHome(null)
      flag(onboardedKey(home.id))
    }
    const turnTo = selected && selectedEntry ? turned(selectedEntry, selected) : null
    const canTurn = Boolean(selected && selectedEntry && turnTo && checkPlacement(selectedEntry, turnTo, roomObjects, lookup, selected.id).ok)

    const panelTab = coaching ? 'things' : buildPanel
    return framed(
      'build',
      <main className="build">
        <header className="build-header">
          <h1>Build</h1>
          <button
            type="button"
            className={coaching && step === 3 ? 'build-done build-done-ready' : 'build-done'}
            ref={doneRef}
            onClick={() => (setSelectedId(null), setPlacing(null), coaching && finishCoach(), back())}
          >
            Finish
          </button>
        </header>
        <div className="build-stage">
          {roomPill}
          <BuildRoom
            room={room}
            objects={roomObjects}
            stages={stages}
            neglect={neglect}
            overdue={objectOverdue(chores, condition.statuses)}
            pet={petInRoom}
            selectedId={selectedId}
            onSelect={(id) => (setSelectedId(id), setPlacing(null))}
            placing={placing}
            onCommit={commit}
            onPlacingDone={() => setPlacing(null)}
          />
        </div>
        <div className="build-panel">
          {coaching && (
            <CoachCard
              step={step}
              choreCount={activeChores.filter((c) => roomObjects.some((o) => o.id === c.objectId)).length}
              sheetOpen={Boolean(selected)}
              placing={Boolean(placing)}
              onSkip={() => (finishCoach(), doneRef.current?.focus())}
            />
          )}
          {selected && selectedEntry ? (
            <ObjectSheet
              object={selected}
              entry={selectedEntry}
              chores={activeChores.filter((c) => c.objectId === selected.id)}
              completions={completions}
              vacations={home.vacations}
              today={today}
              canTurn={canTurn}
              onSaveChore={(chore, value) =>
                appStore.apply(...(chore ? updateChore(chore, value, today) : addChore(home, { ...value, objectId: selected.id }, today)))
              }
              onRemoveChore={(chore) => appStore.apply(...removeChore(chore.id, data, today))}
              onTurn={() => turnTo && canTurn && appStore.apply(...moveObject(selected, turnTo))}
              onRemove={(keepChores) => {
                appStore.apply(...removeObject(selected.id, data, today, keepChores))
                setSelectedId(null)
              }}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className={coaching && step === 1 ? 'build-extras coach-pulse' : 'build-extras'}>
              {!wide && !coaching && (
                <div className="build-tabs" role="group" aria-label="Show">
                  <button type="button" aria-pressed={panelTab === 'things'} onClick={() => setBuildPanel('things')}>
                    Add things
                  </button>
                  <button type="button" aria-pressed={panelTab === 'style'} onClick={() => setBuildPanel('style')}>
                    Walls and floor
                  </button>
                </div>
              )}
              {(wide || panelTab === 'things') && (
                <CatalogTray
                  roomType={room.type}
                  objects={roomObjects}
                  unlocked={progress?.unlockedItems}
                  oneRow={!wide}
                  onPick={(entry) => (setSelectedId(null), setPlacing(entry))}
                />
              )}
              {(wide || panelTab === 'style') && (
                <RoomStylePicker
                  wallStyle={room.wallStyle}
                  floorStyle={room.floorStyle}
                  progress={progress}
                  onChange={(patch) => appStore.apply(...updateRoom(room, patch))}
                />
              )}
            </div>
          )}
        </div>
        {roomsSheet}
      </main>,
    )
  }

  const sample = home.name === SAMPLE_HOME_NAME
  const completeChore = (chore: Chore) => {
    const done = completeChoreWithRewards(chore, progress, { chores, completions, vacations: home.vacations }, devNow())
    appStore.apply(...done.ops)
    flag(hintKey(home.id))
    play('sparkle')
    // The gift waits for the cheer and sparkle to play, so the done moment is seen first.
    const completedAtRevision = historyRevision.current
    if (done.unlocked.length) window.setTimeout(() => {
      if (currentScope.current === scope && historyRevision.current === completedAtRevision) setGifts((queue) => [...queue, ...done.unlocked])
    }, GIFT_DELAY_MS)
    const key = ++momentKey.current
    const big = condition.statuses.some((s) => s.choreId === chore.id && s.neglect === 3)
    const first = !completions.some((c) => c.completedOn === today)
    setCelebrate({ key, choreName: chore.name, big, first })
    if (done.completion) setUndo({ key, kind: 'done', completionId: done.completion.id, choreName: chore.name })
    const placed = roomObjects.find((o) => o.id === chore.objectId)
    const entry = placed && catalogEntry(placed.catalogId)
    if (placed && entry) setSparkles((list) => [...list, { id: key, ...sparkleSpot(placed, entry) }])
  }
  const choreList = (short: boolean) => (
    <ChoreList
      chores={activeChores}
      completions={completions}
      vacations={home.vacations}
      today={today}
      onComplete={completeChore}
      onEdit={(chore) => setView({ name: 'edit', choreId: chore.id })}
      onAdd={() => setView({ name: 'edit' })}
      onManage={short ? undefined : () => setView({ name: 'chores' })}
      limit={short ? upNextRows(viewport.height, sample) : undefined}
      onSeeAll={short ? () => setAllChores(true) : undefined}
      footer={short && toastInHomeList ? undoToast : undefined}
    />
  )

  return framed(
    'home',
    <main className="home">
      <header className="home-top">
        <h1>{pet.name}</h1>
        <HealthBar health={condition.health} mood={condition.mood} away={away} streak={homeStreak} />
      </header>

      {sample && (
        <SampleBanner
          onKeep={() => appStore.apply(...adoptSample(home))}
          onStartFresh={() => (setBuilding(false), setView({ name: 'home' }), appStore.apply(...removeHome(home.id)))}
        />
      )}

      <div className="home-stage" style={ROOM_ASPECT_VARS}>
        {roomPill}
        {room && (
          <LivingRoom
            room={room}
            objects={roomObjects}
            stages={stages}
            neglect={neglect}
            pet={pet}
            mood={condition.mood}
            away={away}
            chores={activeChores}
            statuses={condition.statuses}
            celebrate={celebrate}
            overlay={sparkles.map((s) => (
              <Sparkle key={s.id} x={s.x} y={s.y} size={s.size} onDone={() => setSparkles((list) => list.filter((o) => o.id !== s.id))} />
            ))}
          />
        )}
        {roomObjects.length === 0 && (
          <button type="button" className="home-build" onClick={openBuild}>
            Build your room
          </button>
        )}
      </div>

      <div className="home-chores">
        {showFirstDoneHint({
          onboarded: readFlag(onboardedKey(home.id)),
          hintDone: readFlag(hintKey(home.id)),
          completionCount: completions.length,
          dueChore: hasDueChore(chores, completions, today, home.vacations),
        }) && <FirstDoneHint onClose={() => flag(hintKey(home.id))} />}
        {choreList(!wide)}
      </div>

      {!syncNote && (
        <p className="home-alert" role="alert">
          This browser isn't saving your home. Try a regular (not private) window.
        </p>
      )}

      {roomsSheet}
      {allChores && (
        <Sheet title="All chores" onClose={() => navigation.dismiss()} footer={!gifts.length && undoToast}>
          {choreList(false)}
        </Sheet>
      )}
    </main>,
  )
}
