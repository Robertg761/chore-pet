import { useEffect, useRef, useState, type ReactNode } from 'react'
import { catalogEntry } from './catalog/objects'
import type { CatalogEntry } from './catalog/types'
import { CharacterArt } from './character/Character'
import { isInVacation } from './domain/dates'
import { petCondition } from './domain/health'
import { messStageFor, objectNeglect } from './domain/mess'
import type { Chore, RoomType } from './domain/types'
import { currentStreak, type Unlock } from './domain/unlocks'
import { ITEMS } from './character/items'
import {
  addChore,
  adoptSample,
  completeChoreWithRewards,
  uncompleteChore,
  updatePet,
  updateRoom,
  createHousehold,
  createRoom,
  moveObject,
  placeObject,
  removeChore,
  removeHome,
  removeObject,
  setVacations,
  updateChore,
} from './data/actions'
import { appStore, startAppStore, useDataState, useHome } from './data/appStore'
import type { SyncStatus } from './data/store'
import { devNow } from './lib/devClock'
import { useToday } from './lib/useToday'
import { SAMPLE_HOME_NAME, sampleHome } from './content/sampleHome'
import { useInstallPrompt } from './pwa/useInstallPrompt'
import { BuildRoom, type BuildChange } from './room/BuildRoom'
import { HomeScene } from './room/HomeScene'
import { Room } from './room/Room'
import { doorwayFootprint, doorsForRoom, roomConnections } from './room/connections'
import { homeLayout } from './room/homeLayout'
import { HomeTraveler } from './pet/HomeTraveler'
import { useHomePet } from './pet/useHomePet'
import { RoomControls } from './room/RoomControls'
import { orderRooms, readRoomOrder, writeRoomOrder, readFocusedRoomId, resolveFocusedRoomId, roomNames, writeFocusedRoomId } from './room/roomFocus'
import { Sparkle } from './effects'
import { checkPlacement, turned } from './room/grid'
import { lookup } from './room/placement'
import { LivingRoom, type Celebration } from './pet/LivingRoom'
import { CatalogTray } from './screens/CatalogTray'
import { CharacterCreator } from './screens/CharacterCreator'
import { ChoreEditor } from './screens/ChoreEditor'
import { ChoreList } from './screens/ChoreList'
import { sparkleSpot, type SparkleSpot } from './screens/doneMoment'
import { HealthBar } from './screens/HealthBar'
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
import { upNextRows } from './shell/layout'
import { useViewport, useWide } from './shell/useViewport'

type View = { name: 'home' } | { name: 'build' } | { name: 'edit'; choreId?: string } | { name: 'vacation' } | { name: 'rewards' } | { name: 'week' } | { name: 'creator' } | { name: 'wardrobe' } | { name: 'share' } | { name: 'settings' }

/** Where each screen sits, left to right: the tabs in their order, then the screens opened from them. */
const VIEW_RANK: Record<View['name'], number> = { home: 0, build: 1, wardrobe: 2, rewards: 3, edit: 4, week: 5, creator: 5, share: 5, vacation: 5, settings: 5 }

/** How long the gift waits after Done, so the cheer, sparkle and health float play first. */
const GIFT_DELAY_MS = 1400

/** The browser tab's title per screen. */
const VIEW_TITLE: Record<View['name'], string> = {
  home: 'Chore Pet',
  build: 'Build · Chore Pet',
  edit: 'Edit chore · Chore Pet',
  vacation: 'Vacation mode · Chore Pet',
  rewards: 'Rewards · Chore Pet',
  week: 'Your week · Chore Pet',
  creator: 'Change look · Chore Pet',
  wardrobe: 'Wardrobe · Chore Pet',
  share: 'Share your home · Chore Pet',
  settings: 'Settings · Chore Pet',
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
  const [roomOrder, setRoomOrder] = useState<{ homeId: string; ids: string[] } | null>(null)
  const rooms = orderRooms(data.rooms, roomOrder?.homeId === data.home?.id
    ? roomOrder?.ids ?? [] : data.home ? readRoomOrder(data.home.id) : [])
  const roomIds = rooms.map((room) => room.id)
  if (data.home && rooms.length && (roomOrder?.homeId !== data.home.id || roomIds.join() !== roomOrder.ids.join())) {
    setRoomOrder({ homeId: data.home.id, ids: roomIds })
  }
  useEffect(() => {
    if (roomOrder) writeRoomOrder(roomOrder.homeId, roomOrder.ids)
  }, [roomOrder])
  const today = useToday()
  const [view, setViewNow] = useState<View>({ name: 'home' })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [placing, setPlacing] = useState<CatalogEntry | null>(null)
  const [roomFocus, setRoomFocus] = useState<{ homeId: string; roomId: string } | null>(null)
  const focusedRoomId = resolveFocusedRoomId(rooms,
    roomFocus?.homeId === data.home?.id ? roomFocus?.roomId : data.home ? readFocusedRoomId(data.home.id) : null)
  const layout = homeLayout(roomIds)
  const connections = roomConnections(layout, data.objects)
  const travel = useHomePet(data.home?.id, focusedRoomId, layout, connections, data.objects, roomNames(rooms), data.pet?.name ?? 'Your pet', view.name)
  /** Change screen with a short slide: forward when going deeper, back when returning. */
  const setView = (next: View) => {
    if (next.name === view.name) { setViewNow(next); return }
    travel.pause()
    const step = VIEW_RANK[next.name] - VIEW_RANK[view.name]
    withViewTransition(() => setViewNow(next), step > 0 ? 'forward' : step < 0 ? 'back' : 'fade')
  }
  // First launch: the landing choice, or the picker once "Build my home" is tapped.
  const [building, setBuilding] = useState(false)
  // First run: the welcome beat after "Move in", then the coach card while building the first room.
  const [welcome, setWelcome] = useState(false)
  const [coachHome, setCoachHome] = useState<string | null>(null)
  const [, setFlagTick] = useState(0)
  const { canInstall, install } = useInstallPrompt()
  // The completion moment: the pet cheers and each cleaned object gets its own sparkle.
  const [celebrate, setCelebrate] = useState<(Celebration & { homeId: string }) | null>(null)
  if (celebrate && celebrate.homeId !== data.home?.id) setCelebrate(null)
  const [sparkles, setSparkles] = useState<(SparkleSpot & { id: number; roomId: string })[]>([])
  const [gifts, setGifts] = useState<Unlock[]>([])
  // The last chore ticked off, for a few seconds, so a slip can be undone.
  const [undo, setUndo] = useState<{ key: number; completionId: string; choreName: string } | null>(null)
  const momentKey = useRef(0)
  const doneRef = useRef<HTMLButtonElement>(null)
  const viewport = useViewport()
  const wide = useWide()
  // A chore being edited that no longer exists (deleted on another device) sends the editor home.
  const staleEdit = view.name === 'edit' && view.choreId !== undefined && !data.chores.some((c) => c.id === view.choreId)
  if (staleEdit) setViewNow({ name: 'home' })
  // Each screen names itself and takes focus at its heading, so keyboard and screen-reader users land on it.
  useEffect(() => {
    document.title = VIEW_TITLE[view.name]
    if (view.name === 'home') return
    const heading = document.querySelector<HTMLElement>('.app-view h1')
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1')
      heading.focus({ preventScroll: true })
    }
  }, [view.name])
  const [allChores, setAllChores] = useState(false)
  const [buildPanel, setBuildPanel] = useState<'things' | 'style'>('things')
  // Reset before rendering a new room, including a room removed by a sync.
  const editScope = `${data.home?.id ?? ''}:${focusedRoomId ?? ''}`
  const [previousEditScope, setPreviousEditScope] = useState(editScope)
  if (previousEditScope !== editScope) {
    setPreviousEditScope(editScope)
    setSelectedId(null)
    setPlacing(null)
  }

  // The pet's daily nudge (while the app is open); needs the same view of the day as the screen.
  const reminderStatuses = data.home ? petCondition(data.chores, data.completions, today, data.home.vacations).statuses : []
  useReminders(
    data.home && data.pet
      ? { pet: data.pet, chores: data.chores, statuses: reminderStatuses, today, away: isInVacation(today, data.home.vacations) }
      : null,
  )

  // Homes made before rooms existed get their first room.
  const needsRoom = Boolean(data.home && data.rooms.length === 0)
  useEffect(() => {
    if (needsRoom && data.home) appStore.apply(...createRoom(data.home))
  }, [needsRoom, data.home])

  if (!ready) return <main className="shell" aria-busy="true" />
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
            onSample={(species) => appStore.apply(...sampleHome({ species, userId: snapshot.userId, today }))}
            onBuild={() => setBuilding(true)}
          />
        )}
      </main>
    )
  }

  const { home, pet, progress, objects, chores, completions } = data
  const room = rooms.find((candidate) => candidate.id === focusedRoomId)
  const names = roomNames(rooms)
  const focusRoom = (roomId: string) => {
    if (roomId === focusedRoomId) { travel.go(roomId); return }
    travel.pause()
    setSelectedId(null)
    setPlacing(null)
    setSparkles([])
    setCelebrate(null)
    setRoomFocus({ homeId: home.id, roomId })
    writeFocusedRoomId(home.id, roomId)
  }
  const addRoom = (type: RoomType) => {
    const ops = createRoom(home, type)
    appStore.apply(...ops)
    focusRoom(ops[0].key)
  }
  const back = () => setView({ name: 'home' })
  const flag = (key: string) => (writeFlag(key), setFlagTick((n) => n + 1))
  // Build mode for the first time shows the coach card; it stays for this visit once started.
  const openBuild = () => {
    if (!readFlag(onboardedKey(home.id)) && objects.length === 0) setCoachHome(home.id)
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
    { label: 'Your week', onSelect: () => setView({ name: 'week' }) },
    { label: 'Change look', onSelect: () => setView({ name: 'creator' }) },
    { label: 'Share your home', onSelect: () => setView({ name: 'share' }) },
    { label: 'Vacation mode', onSelect: () => setView({ name: 'vacation' }) },
    { label: 'Settings', onSelect: () => setView({ name: 'settings' }) },
    ...(canInstall ? [{ label: 'Add to home screen', onSelect: () => void install() }] : []),
  ]
  /** A screen inside the app frame: the tabs along the bottom (phones) or down the left (wide). */
  const framed = (active: Tab, content: ReactNode) => (
    <div className="app">
      <div className="app-view">{content}</div>
      <AppNav
        active={active}
        onNavigate={(tab) => (setSelectedId(null), setPlacing(null), tab === 'build' ? openBuild() : setView({ name: tab } as View))}
        rewardsNote={rewardsNote(progress)}
        more={more}
        note={syncNote ?? undefined}
      />
    </div>
  )

  if (view.name === 'edit') {
    // Looked up fresh each render: a chore deleted elsewhere (another device, a sync) is never written back.
    const chore = view.choreId ? chores.find((c) => c.id === view.choreId) : undefined
    // Places a chore can belong to, named like the catalog; duplicates are numbered ("Rug 2").
    const seen = new Map<string, number>()
    const places = objects
      .flatMap((o) => {
        const name = catalogEntry(o.catalogId)?.name
        if (!name) return []
        const key = `${o.roomId}:${name}`
        const n = (seen.get(key) ?? 0) + 1
        seen.set(key, n)
        const objectName = n > 1 ? `${name} ${n}` : name
        return [{ id: o.id, name: rooms.length > 1 ? `${names[o.roomId]} · ${objectName}` : objectName }]
      })
    return framed(
      'home',
      <main className="shell screen">
        <ChoreEditor
          chore={chore}
          places={places}
          onSave={(value) => {
            appStore.apply(...(chore ? updateChore(chore, value, today) : addChore(home, value, today)))
            back()
          }}
          onDelete={
            chore &&
            (() => {
              appStore.apply(...removeChore(chore.id, data))
              back()
            })
          }
          onCancel={back}
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
        <SettingsScreen petName={pet.name} homeId={home.id} onClose={back} />
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
          objects={objects.filter((o) => o.roomId === room.id)}
          choreCount={progress?.choreCount ?? 0}
          // Worked out for today, like the rewards screen: the stored streak is from the last chore done.
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
  const overdue = objectOverdue(chores, condition.statuses)
  const roomObjects = room ? objects.filter((o) => o.roomId === room.id) : []
  const roomDoors = room ? doorsForRoom(connections, room.id) : []
  const reserved = roomDoors.map(doorwayFootprint)
  const hasWestWindow = !roomDoors.some((door) => door.side === 'west')
  const resident = travel.position && rooms.find((candidate) => candidate.id === travel.position?.roomId)
  const residentObjects = resident ? objects.filter((object) => object.roomId === resident.id) : []
  const stationaryPet = !travel.journey && travel.position ? {
    tile: travel.position,
    art: <CharacterArt species={pet.species} mood={condition.mood} pose={away ? 'sleeping' : undefined} bodyColour={pet.bodyColour} equipped={pet.equipped} look={{ eyes: pet.eyes, cheeks: pet.cheeks }} strokeScale={PET_STROKE_SCALE} />,
  } : null
  const petInRoom = resident?.id === room?.id ? stationaryPet : null
  const livingRoom = resident && travel.position && !travel.journey ? (
    <LivingRoom
      key={`${home.id}:${resident.id}`}
      room={resident}
      objects={residentObjects}
      stages={stages}
      neglect={neglect}
      pet={pet}
      mood={condition.mood}
      away={away}
      initialTile={travel.position}
      onPosition={(tile) => travel.onPosition({ roomId: resident.id, ...tile })}
      chores={chores.filter((chore) => residentObjects.some((object) => object.id === chore.objectId))}
      statuses={condition.statuses}
      celebrate={resident.id === room?.id ? celebrate : null}
      onCelebrated={(key) => setCelebrate((current) => current?.key === key ? null : current)}
      overlay={sparkles.filter((sparkle) => sparkle.roomId === resident.id).map((sparkle) => (
        <Sparkle key={sparkle.id} x={sparkle.x} y={sparkle.y} size={sparkle.size} onDone={() => setSparkles((list) => list.filter((other) => other.id !== sparkle.id))} />
      ))}
    />
  ) : null
  const scene = (focusedRoom: ReactNode) => room && (
    <HomeScene
      rooms={rooms}
      objects={objects}
      focusedRoomId={room.id}
      onFocus={focusRoom}
      focusedRoom={focusedRoom}
      residentRoomId={resident?.id}
      residentRoom={view.name === 'home' ? livingRoom : resident && resident.id !== room.id && stationaryPet ? <Room room={resident} objects={residentObjects} stages={stages} neglect={neglect} pet={stationaryPet} /> : null}
      connections={connections}
      travelNotice={travel.notice}
      overlay={travel.journey && <HomeTraveler key={travel.journey.id} path={travel.journey.path} layout={layout} pet={pet} mood={condition.mood} away={away} onPosition={travel.onPosition} onDone={(at) => travel.arrive(travel.journey!.id, at)} />}
      stages={stages}
      neglect={neglect}
      overdue={overdue}
    />
  )

  if (view.name === 'build' && room) {
    const selected = roomObjects.find((o) => o.id === selectedId) ?? null
    const selectedEntry = selected ? catalogEntry(selected.catalogId) : undefined
    const coaching = coachHome === home.id && !readFlag(onboardedKey(home.id))
    const commit = (change: BuildChange) => {
      if (change.kind === 'add') {
        if (!checkPlacement(change.entry, change.placement, roomObjects, lookup, undefined, reserved, hasWestWindow).ok) return
        // Select what was just placed so its sheet shows the chores it brought.
        const ops = placeObject(room, change.entry, change.placement, today)
        appStore.apply(...ops)
        // While coaching, keep the tray open so the next pick is one tap away.
        if (!coaching) setSelectedId(ops[0].key)
      }
      else {
        const obj = roomObjects.find((o) => o.id === change.id)
        const entry = obj && catalogEntry(obj.catalogId)
        if (obj && entry && checkPlacement(entry, change.placement, roomObjects, lookup, obj.id, reserved, hasWestWindow).ok) appStore.apply(...moveObject(obj, change.placement))
      }
    }
    const step = coachStep(roomObjects.length)
    const finishCoach = () => {
      setCoachHome(null)
      flag(onboardedKey(home.id))
    }
    const turnTo = selected && selectedEntry ? turned(selectedEntry, selected) : null
    const canTurn = Boolean(selected && selectedEntry && turnTo && checkPlacement(selectedEntry, turnTo, roomObjects, lookup, selected.id, reserved, hasWestWindow).ok)

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
          <RoomControls rooms={rooms} focusedRoomId={room.id} onFocus={focusRoom} onAdd={addRoom} />
          <BuildRoom
            room={room}
            objects={roomObjects}
            stages={stages}
            neglect={neglect}
            overdue={overdue}
            pet={petInRoom}
            reserved={reserved}
            hasWestWindow={hasWestWindow}
            selectedId={selectedId}
            onSelect={(id) => (setSelectedId(id), setPlacing(null))}
            placing={placing}
            onCommit={commit}
            onPlacingDone={() => setPlacing(null)}
            renderScene={scene}
          />
        </div>
        <div className="build-panel">
          {coaching && (
            <CoachCard
              step={step}
              choreCount={chores.filter((c) => roomObjects.some((o) => o.id === c.objectId)).length}
              sheetOpen={Boolean(selected)}
              placing={Boolean(placing)}
              onSkip={() => (finishCoach(), doneRef.current?.focus())}
            />
          )}
          {selected && selectedEntry ? (
            <ObjectSheet
              object={selected}
              entry={selectedEntry}
              chores={chores.filter((c) => c.objectId === selected.id)}
              completions={completions}
              vacations={home.vacations}
              today={today}
              canTurn={canTurn}
              onSaveChore={(chore, value) =>
                appStore.apply(...(chore ? updateChore(chore, value, today) : addChore(home, { ...value, objectId: selected.id }, today)))
              }
              onRemoveChore={(chore) => appStore.apply(...removeChore(chore.id, data))}
              onTurn={() => turnTo && canTurn && appStore.apply(...moveObject(selected, turnTo))}
              onRemove={(keepChores) => {
                // Kept chores stay on the list without a home object; otherwise they go and their counts are retired.
                const own = chores.filter((c) => c.objectId === selected.id)
                if (keepChores) appStore.apply(...own.flatMap((c) => updateChore(c, { objectId: null }, today)), ...removeObject(selected.id))
                else appStore.apply(...removeObject(selected.id, data))
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
                  reserved={reserved}
                  hasWestWindow={hasWestWindow}
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
      </main>,
    )
  }

  const sample = home.name === SAMPLE_HOME_NAME
  const completeChore = (chore: Chore) => {
    const placed = objects.find((object) => object.id === chore.objectId)
    if (placed) focusRoom(placed.roomId)
    const done = completeChoreWithRewards(chore, progress, { chores, completions, vacations: home.vacations }, devNow())
    appStore.apply(...done.ops)
    flag(hintKey(home.id))
    play('sparkle')
    // The gift waits for the cheer and sparkle to play, so the done moment is seen first.
    if (done.unlocked.length) window.setTimeout(() => setGifts((queue) => [...queue, ...done.unlocked]), GIFT_DELAY_MS)
    const key = ++momentKey.current
    const big = condition.statuses.some((s) => s.choreId === chore.id && s.neglect === 3)
    const first = !completions.some((c) => c.completedOn === today)
    setCelebrate({ key, homeId: home.id, choreName: chore.name, big, first })
    if (done.completion) setUndo({ key, completionId: done.completion.id, choreName: chore.name })
    const entry = placed && catalogEntry(placed.catalogId)
    if (placed && entry) setSparkles((list) => [...list, { id: key, roomId: placed.roomId, ...sparkleSpot(placed, entry) }])
  }
  const choreList = (short: boolean) => (
    <ChoreList
      chores={chores}
      completions={completions}
      vacations={home.vacations}
      today={today}
      onComplete={completeChore}
      onEdit={(chore) => (setAllChores(false), setView({ name: 'edit', choreId: chore.id }))}
      onAdd={() => (setAllChores(false), setView({ name: 'edit' }))}
      limit={short ? Math.min(rooms.length > 1 ? 2 : 3, upNextRows(viewport.height - 120, sample)) : undefined}
      onSeeAll={short ? () => setAllChores(true) : undefined}
    />
  )

  return framed(
    'home',
    <main className="home">
      <header className="home-top">
        <h1>{pet.name}</h1>
        <HealthBar health={condition.health} mood={condition.mood} away={away} />
      </header>

      {sample && (
        <SampleBanner
          onKeep={() => appStore.apply(...adoptSample(home))}
          onStartFresh={() => (setBuilding(false), setView({ name: 'home' }), appStore.apply(...removeHome(home.id)))}
        />
      )}

      <div className="home-stage">
        {room && (
          <>
            <RoomControls rooms={rooms} focusedRoomId={room.id} onFocus={focusRoom} />
            {scene(
              <Room room={room} objects={roomObjects} stages={stages} neglect={neglect} overdue={overdue} />,
            )}
          </>
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

      {allChores && !wide && (
        <Sheet title="All chores" onClose={() => setAllChores(false)}>
          {choreList(false)}
        </Sheet>
      )}

      {undo && (
        <UndoToast
          key={undo.key}
          choreName={undo.choreName}
          onUndo={() => {
            // Any gift that tap earned stays: rewards are never taken back.
            appStore.apply(...uncompleteChore(undo.completionId, progress, completions))
            setUndo(null)
          }}
          onClose={() => setUndo(null)}
        />
      )}

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
        />
      )}
    </main>,
  )
}
