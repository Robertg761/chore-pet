import { useEffect, useState } from 'react'
import { Character } from './character/Character'
import { isInVacation } from './domain/dates'
import { petCondition } from './domain/health'
import type { Chore } from './domain/types'
import { addChore, completeChore, createHousehold, removeChore, setVacations, updateChore } from './data/actions'
import { appStore, startAppStore, useDataState, useHome } from './data/appStore'
import type { SyncStatus } from './data/store'
import { useToday } from './lib/useToday'
import { ChoreEditor } from './screens/ChoreEditor'
import { ChoreList } from './screens/ChoreList'
import { PetPicker } from './screens/PetPicker'
import { VacationScreen } from './screens/VacationScreen'

type View = { name: 'home' } | { name: 'edit'; chore?: Chore } | { name: 'vacation' }

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

  if (!ready) return <main className="shell" aria-busy="true" />

  if (!data.home || !data.pet) {
    return (
      <main className="shell">
        <PetPicker onChoose={({ species, name }) => appStore.apply(...createHousehold({ species, petName: name, userId: snapshot.userId }))} />
      </main>
    )
  }

  const { home, pet, progress, chores, completions } = data
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

  return (
    <main className="shell">
      <header className="pet-header">
        <h1>{pet.name}</h1>
        <p className="health">
          {away ? 'On vacation' : `Health ${condition.health}% · feeling ${condition.mood}`}
        </p>
      </header>

      <Character species={pet.species} mood={condition.mood} pose={away ? 'sleeping' : undefined} bodyColour={pet.bodyColour} equipped={pet.equipped} size={220} />

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

      <footer className="dev-note">{SYNC_LABEL[sync]}</footer>
    </main>
  )
}
