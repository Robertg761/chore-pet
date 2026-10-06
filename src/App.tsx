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
import { RoomStylePicker } from './screens/RoomStylePicker'
import { VacationScreen } from './screens/VacationScreen'
import { Wardrobe } from './screens/Wardrobe'
import { WeekView } from './screens/WeekView'

type View = { name: 'home' } | { name: 'build' } | { name: 'edit'; chore?: Chore } | { name: 'vacation' } | { name: 'rewards' } | { name: 'week' } | { name: 'creator' } | { name: 'wardrobe' }

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
  const { canInstall, install } = useInstallPrompt()
  // The completion moment: the pet cheers and each cleaned object gets its own sparkle.
  const [celebrate, setCelebrate] = useState<Celebration | null>(null)
  const [sparkles, setSparkles] = useState<(SparkleSpot & { id: number })[]>([])
  const [gifts, setGifts] = useState<Unlock[]>([])
  const momentKey = useRef(0)

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
            <PetPicker onChoose={({ species, name }) => appStore.apply(...createHousehold({ species, petName: name, userId: snapshot.userId }))} />
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
    const commit = (change: BuildChange) => {
      if (change.kind === 'add') {
        // Select what was just placed so its sheet shows the chores it brought.
        const ops = placeObject(room, change.entry, change.placement, today)
        appStore.apply(...ops)
        setSelectedId(ops[0].key)
      }
      else {
        const obj = roomObjects.find((o) => o.id === change.id)
        if (obj) appStore.apply(...moveObject(obj, change.placement))
      }
    }
    const turnTo = selected && selectedEntry ? turned(selectedEntry, selected) : null
    const canTurn = Boolean(selected && selectedEntry && turnTo && checkPlacement(selectedEntry, turnTo, roomObjects, lookup, selected.id).ok)

    return (
      <main className="shell shell-wide">
        <header className="build-header">
          <h1>Build</h1>
          <button type="button" className="build-done" onClick={() => (setSelectedId(null), setPlacing(null), back())}>
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
          <>
            <CatalogTray roomType={room.type} objects={roomObjects} unlocked={progress?.unlockedItems} onPick={(entry) => (setSelectedId(null), setPlacing(entry))} />
            <RoomStylePicker
              wallStyle={room.wallStyle}
              floorStyle={room.floorStyle}
              progress={progress}
              onChange={(patch) => appStore.apply(...updateRoom(room, patch))}
            />
          </>
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

      <button type="button" className="build-open" onClick={() => setView({ name: 'build' })}>
        {roomObjects.length ? 'Build' : 'Build your room'}
      </button>
      <button type="button" className="build-open" onClick={() => setView({ name: 'rewards' })}>
        {rewardsButtonLabel(progress)}
      </button>

      <ChoreList
        chores={chores}
        completions={completions}
        vacations={home.vacations}
        today={today}
        onComplete={(chore) => {
          const done = completeChoreWithRewards(chore, progress, { chores, completions, vacations: home.vacations }, devNow())
          appStore.apply(...done.ops)
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
