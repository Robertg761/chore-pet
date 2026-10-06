import { useEffect, useRef, useState } from 'react'
import { catalogEntry } from './catalog/objects'
import type { CatalogEntry } from './catalog/types'
import { CharacterArt } from './character/Character'
import { isInVacation } from './domain/dates'
import { petCondition } from './domain/health'
import { objectMessStages } from './domain/mess'
import type { Chore } from './domain/types'
import type { Unlock } from './domain/unlocks'
import { ITEMS } from './character/items'
import {
  addChore,
  adoptSample,
  completeChoreWithRewards,
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
import { Sparkle } from './effects'
import { checkPlacement, footprintOf, freeTile, turned } from './room/grid'
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
import { rewardsButtonLabel } from './screens/rewardsModel'
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

type View = { name: 'home' } | { name: 'build' } | { name: 'edit'; chore?: Chore } | { name: 'vacation' } | { name: 'rewards' } | { name: 'week' } | { name: 'creator' } | { name: 'wardrobe' } | { name: 'share' } | { name: 'settings' }

const SYNC_LABEL: Record<SyncStatus, string> = {
  'local-only': 'Saved on this device',
  offline: 'Offline, saved on this device',
  syncing: 'Syncing',
  synced: 'Synced',
  error: 'Will sync when it can',
}

export default function App() {
  useEffect(startAppStore, [])
  const { ready, sync, snapshot } = useDataState()
  const data = useHome()
  const today = useToday()
  const [view, setView] = useState<View>({ name: 'home' })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [placing, setPlacing] = useState<CatalogEntry | null>(null)
  // First launch: the landing choice, or the picker once "Build my home" is tapped.
  const [building, setBuilding] = useState(false)
  // First run: the welcome beat after "Move in", then the coach card while building the first room.
  const [welcome, setWelcome] = useState(false)
  const [coachHome, setCoachHome] = useState<string | null>(null)
  const [, setFlagTick] = useState(0)
  const { canInstall, install } = useInstallPrompt()
  // The completion moment: the pet cheers and each cleaned object gets its own sparkle.
  const [celebrate, setCelebrate] = useState<Celebration | null>(null)
  const [sparkles, setSparkles] = useState<(SparkleSpot & { id: number })[]>([])
  const [gifts, setGifts] = useState<Unlock[]>([])
  const momentKey = useRef(0)
  const doneRef = useRef<HTMLButtonElement>(null)

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

  if (!data.home || !data.pet) {
    return (
      <main className="shell">
        {building ? (
          <>
            <button type="button" className="link-button landing-back" onClick={() => setBuilding(false)}>
              Back
            </button>
            <PetPicker
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

  const { home, pet, progress, rooms, objects, chores, completions } = data
  const room = rooms[0]
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

  if (view.name === 'edit') {
    const { chore } = view
    return (
      <main className="shell">
        <ChoreEditor
          chore={chore}
          onSave={(value) => {
            appStore.apply(...(chore ? updateChore(chore, value) : addChore(home, value, today)))
            back()
          }}
          onDelete={
            chore &&
            (() => {
              appStore.apply(...removeChore(chore.id))
              back()
            })
          }
          onCancel={back}
        />
      </main>
    )
  }

  if (view.name === 'vacation') {
    return (
      <main className="shell">
        <VacationScreen vacations={home.vacations} today={today} onChange={(v) => appStore.apply(...setVacations(home, v))} onClose={back} />
      </main>
    )
  }

  if (view.name === 'settings') {
    return (
      <main className="shell">
        <SettingsScreen petName={pet.name} onClose={back} />
      </main>
    )
  }

  if (view.name === 'share' && rooms[0]) {
    return (
      <main className="shell">
        <ShareCard
          pet={pet}
          room={rooms[0]}
          objects={objects.filter((o) => o.roomId === rooms[0].id)}
          choreCount={progress?.choreCount ?? 0}
          streak={progress?.currentStreak ?? 0}
          onClose={back}
        />
      </main>
    )
  }

  if (view.name === 'creator') {
    return (
      <main className="shell">
        <CharacterCreator pet={pet} onSave={(patch) => appStore.apply(...updatePet(pet, patch))} onClose={back} />
      </main>
    )
  }

  if (view.name === 'wardrobe') {
    return (
      <main className="shell">
        <Wardrobe pet={pet} progress={progress} onChange={(patch) => appStore.apply(...updatePet(pet, patch))} onClose={back} />
      </main>
    )
  }

  if (view.name === 'week') {
    return (
      <main className="shell">
        <WeekView chores={chores} completions={completions} vacations={home.vacations} today={today} onClose={back} />
      </main>
    )
  }

  if (view.name === 'rewards') {
    return (
      <main className="shell">
        <RewardsScreen
          pet={pet}
          progress={progress}
          chores={chores}
          completions={completions}
          vacations={home.vacations}
          today={today}
          onEquip={(equipped) => appStore.apply(...updatePet(pet, { equipped }))}
          onBack={back}
        />
      </main>
    )
  }

  const condition = petCondition(chores, completions, today, home.vacations)
  const away = isInVacation(today, home.vacations)
  const stages = objectMessStages(chores, condition.statuses)
  const roomObjects = room ? objects.filter((o) => o.roomId === room.id) : []
  const solid = roomObjects.flatMap((o) => {
    const e = catalogEntry(o.catalogId)
    return e && e.layer === 'solid' ? [footprintOf(o, e)] : []
  })
  const petTile = freeTile(solid)
  const petInRoom = petTile && {
    tile: petTile,
    art: <CharacterArt species={pet.species} mood={condition.mood} pose={away ? 'sleeping' : undefined} bodyColour={pet.bodyColour} equipped={pet.equipped} look={{ eyes: pet.eyes, cheeks: pet.cheeks }} />,
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

    return (
      <main className="shell shell-wide">
        <header className="build-header">
          <h1>Build</h1>
          <button
            type="button"
            className={coaching && step === 3 ? 'build-done build-done-ready' : 'build-done'}
            ref={doneRef}
            onClick={() => (setSelectedId(null), setPlacing(null), coaching && finishCoach(), back())}
          >
            Done
          </button>
        </header>
        <BuildRoom
          room={room}
          objects={roomObjects}
          stages={stages}
          pet={petInRoom}
          selectedId={selectedId}
          onSelect={(id) => (setSelectedId(id), setPlacing(null))}
          placing={placing}
          onCommit={commit}
          onPlacingDone={() => setPlacing(null)}
        />
        {coaching && (
          <CoachCard
            step={step}
            choreCount={chores.filter((c) => roomObjects.some((o) => o.id === c.objectId)).length}
            sheetOpen={Boolean(selected)}
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
              appStore.apply(...(chore ? updateChore(chore, value) : addChore(home, { ...value, objectId: selected.id }, today)))
            }
            onRemoveChore={(chore) => appStore.apply(...removeChore(chore.id))}
            onTurn={() => turnTo && canTurn && appStore.apply(...moveObject(selected, turnTo))}
            onRemove={() => (appStore.apply(...removeObject(selected.id)), setSelectedId(null))}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className={coaching && step === 1 ? 'build-extras coach-pulse' : 'build-extras'}>
            <CatalogTray roomType={room.type} objects={roomObjects} unlocked={progress?.unlockedItems} onPick={(entry) => (setSelectedId(null), setPlacing(entry))} />
            <RoomStylePicker
              wallStyle={room.wallStyle}
              floorStyle={room.floorStyle}
              progress={progress}
              onChange={(patch) => appStore.apply(...updateRoom(room, patch))}
            />
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="shell">
      <header className="pet-header">
        <div className="pet-title">
          <h1>{pet.name}</h1>
          <div className="pet-actions">
            <button type="button" className="chip-button" onClick={() => setView({ name: 'wardrobe' })}>
              Wardrobe
            </button>
            <button type="button" className="chip-button" onClick={() => setView({ name: 'creator' })}>
              Change look
            </button>
            <button type="button" className="chip-button" onClick={() => setView({ name: 'settings' })} aria-label="Settings">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2.4" />
                <path
                  d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
        <HealthBar health={condition.health} mood={condition.mood} away={away} />
      </header>

      {home.name === SAMPLE_HOME_NAME && (
        <SampleBanner
          onKeep={() => appStore.apply(...adoptSample(home))}
          onStartFresh={() => (setBuilding(false), setView({ name: 'home' }), appStore.apply(...removeHome(home.id)))}
        />
      )}

      {room && (
        <LivingRoom
          room={room}
          objects={roomObjects}
          stages={stages}
          pet={pet}
          mood={condition.mood}
          away={away}
          chores={chores}
          statuses={condition.statuses}
          celebrate={celebrate}
          overlay={sparkles.map((s) => (
            <Sparkle key={s.id} x={s.x} y={s.y} size={s.size} onDone={() => setSparkles((list) => list.filter((o) => o.id !== s.id))} />
          ))}
        />
      )}

      <button type="button" className="build-open" onClick={openBuild}>
        {roomObjects.length ? 'Build' : 'Build your room'}
      </button>
      <button type="button" className="build-open" onClick={() => setView({ name: 'rewards' })}>
        {rewardsButtonLabel(progress)}
      </button>

      {view.name === 'home' &&
        showFirstDoneHint({
          onboarded: readFlag(onboardedKey(home.id)),
          hintDone: readFlag(hintKey(home.id)),
          completionCount: completions.length,
          dueChore: hasDueChore(chores, completions, today, home.vacations),
        }) && <FirstDoneHint onClose={() => flag(hintKey(home.id))} />}

      <ChoreList
        chores={chores}
        completions={completions}
        vacations={home.vacations}
        today={today}
        onComplete={(chore) => {
          const done = completeChoreWithRewards(chore, progress, { chores, completions, vacations: home.vacations }, devNow())
          appStore.apply(...done.ops)
          flag(hintKey(home.id))
          play('sparkle')
          if (done.unlocked.length) setGifts((queue) => [...queue, ...done.unlocked])
          const key = ++momentKey.current
          setCelebrate({ key, choreName: chore.name })
          const placed = roomObjects.find((o) => o.id === chore.objectId)
          const entry = placed && catalogEntry(placed.catalogId)
          if (placed && entry) setSparkles((list) => [...list, { id: key, ...sparkleSpot(placed, entry) }])
        }}
        onEdit={(chore) => setView({ name: 'edit', chore })}
        onAdd={() => setView({ name: 'edit' })}
      />

      <button type="button" className="link-button" onClick={() => setView({ name: 'week' })}>
        Your week
      </button>

      <button type="button" className="link-button" onClick={() => setView({ name: 'share' })}>
        Share your home
      </button>

      <button type="button" className="link-button" onClick={() => setView({ name: 'vacation' })}>
        Vacation mode
      </button>

      {canInstall && (
        <button type="button" className="link-button" onClick={() => void install()}>
          Add to home screen
        </button>
      )}

      <footer className="dev-note">{SYNC_LABEL[sync]}</footer>

      {gifts[0] && (
        <GiftBox
          key={gifts[0].id}
          unlock={gifts[0]}
          pet={pet}
          onClose={({ wear }) => {
            const item = ITEMS.find((i) => i.id === gifts[0].ref)
            if (wear && gifts[0].kind === 'item' && item) appStore.apply(...updatePet(pet, { equipped: { ...pet.equipped, [item.slot]: item.id } }))
            setGifts((queue) => queue.slice(1))
          }}
        />
      )}
    </main>
  )
}
