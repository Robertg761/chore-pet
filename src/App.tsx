import { useEffect, useState } from 'react'
import { catalogEntry } from './catalog/objects'
import type { CatalogEntry } from './catalog/types'
import { CharacterArt } from './character/Character'
import { isInVacation } from './domain/dates'
import { petCondition } from './domain/health'
import { objectMessStages } from './domain/mess'
import type { Chore } from './domain/types'
import {
  addChore,
  completeChore,
  createHousehold,
  createRoom,
  moveObject,
  placeObject,
  removeChore,
  removeObject,
  setVacations,
  updateChore,
} from './data/actions'
import { appStore, startAppStore, useDataState, useHome } from './data/appStore'
import type { SyncStatus } from './data/store'
import { useToday } from './lib/useToday'
import { useInstallPrompt } from './pwa/useInstallPrompt'
import { BuildRoom, type BuildChange } from './room/BuildRoom'
import { checkPlacement, footprintOf, freeTile, turned } from './room/grid'
import { lookup } from './room/placement'
import { Room } from './room/Room'
import { CatalogTray } from './screens/CatalogTray'
import { ChoreEditor } from './screens/ChoreEditor'
import { ChoreList } from './screens/ChoreList'
import { ObjectSheet } from './screens/ObjectSheet'
import { PetPicker } from './screens/PetPicker'
import { VacationScreen } from './screens/VacationScreen'

type View = { name: 'home' } | { name: 'build' } | { name: 'edit'; chore?: Chore } | { name: 'vacation' }

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
  const { canInstall, install } = useInstallPrompt()

  // Homes made before rooms existed get their first room.
  const needsRoom = Boolean(data.home && data.rooms.length === 0)
  useEffect(() => {
    if (needsRoom && data.home) appStore.apply(...createRoom(data.home))
  }, [needsRoom, data.home])

  if (!ready) return <main className="shell" aria-busy="true" />

  if (!data.home || !data.pet) {
    return (
      <main className="shell">
        <PetPicker onChoose={({ species, name }) => appStore.apply(...createHousehold({ species, petName: name, userId: snapshot.userId }))} />
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
    art: <CharacterArt species={pet.species} mood={condition.mood} pose={away ? 'sleeping' : undefined} bodyColour={pet.bodyColour} equipped={pet.equipped} />,
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
          <CatalogTray roomType={room.type} objects={roomObjects} onPick={(entry) => (setSelectedId(null), setPlacing(entry))} />
        )}
      </main>
    )
  }

  return (
    <main className="shell">
      <header className="pet-header">
        <h1>{pet.name}</h1>
        <p className="health">{away ? 'On vacation' : `Health ${condition.health}% · feeling ${condition.mood}`}</p>
      </header>

      {room && <Room room={room} objects={roomObjects} stages={stages} pet={petInRoom} className="home-room" />}

      <button type="button" className="build-open" onClick={() => setView({ name: 'build' })}>
        {roomObjects.length ? 'Build' : 'Build your room'}
      </button>

      <ChoreList
        chores={chores}
        completions={completions}
        vacations={home.vacations}
        today={today}
        onComplete={(chore) => appStore.apply(...completeChore(chore, progress))}
        onEdit={(chore) => setView({ name: 'edit', chore })}
        onAdd={() => setView({ name: 'edit' })}
      />

      <button type="button" className="link-button" onClick={() => setView({ name: 'vacation' })}>
        Vacation mode
      </button>

      {canInstall && (
        <button type="button" className="link-button" onClick={() => void install()}>
          Add to home screen
        </button>
      )}

      <footer className="dev-note">{SYNC_LABEL[sync]}</footer>
    </main>
  )
}
