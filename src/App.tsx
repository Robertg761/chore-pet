import { useEffect, useState } from 'react'
import { Character } from './character/Character'
import { addDays, todayISO } from './domain/dates'
import { petCondition } from './domain/health'
import type { Chore, Completion } from './domain/types'
import { ensureSession, supabaseConfigured } from './lib/supabase'

// Phase 1 scaffold screen: proves the domain logic and character renderer work
// end to end with sample data. Replace with the real chore list UI.

const today = todayISO()

const sampleChores: Chore[] = [
  { id: 'dishes', homeId: 'demo', objectId: null, name: 'Wash dishes', schedule: { kind: 'daily' }, createdOn: addDays(today, -5), photoProof: false },
  { id: 'laundry', homeId: 'demo', objectId: null, name: 'Do laundry', schedule: { kind: 'everyNDays', n: 3 }, createdOn: addDays(today, -5), photoProof: false },
  { id: 'bed', homeId: 'demo', objectId: null, name: 'Make bed', schedule: { kind: 'daily' }, createdOn: addDays(today, -5), photoProof: false },
]

const initialCompletions: Completion[] = [
  { id: 'c1', choreId: 'dishes', completedAt: '', completedOn: addDays(today, -2) },
  { id: 'c2', choreId: 'laundry', completedAt: '', completedOn: addDays(today, -5) },
]

export default function App() {
  const [completions, setCompletions] = useState(initialCompletions)
  const [account, setAccount] = useState<'none' | 'connecting' | 'guest' | 'error'>(supabaseConfigured ? 'connecting' : 'none')
  const condition = petCondition(sampleChores, completions, today)

  useEffect(() => {
    if (!supabaseConfigured) return
    ensureSession()
      .then((s) => setAccount(s ? 'guest' : 'error'))
      .catch(() => setAccount('error'))
  }, [])

  function complete(choreId: string) {
    setCompletions((c) => [...c, { id: crypto.randomUUID(), choreId, completedAt: new Date().toISOString(), completedOn: today }])
  }

  return (
    <main className="shell">
      <header className="pet-header">
        <h1>Pip</h1>
        <p className="health">
          Health {condition.health}% · feeling {condition.mood}
        </p>
      </header>

      <Character species="mochi" mood={condition.mood} bodyColour="#FFD65C" equipped={{ head: 'beanie-red' }} size={220} />

      <section className="chores" aria-label="Today's chores">
        {condition.statuses.map((s) => {
          const chore = sampleChores.find((c) => c.id === s.choreId)!
          return (
            <div key={s.choreId} className="chore">
              <span>{chore.name}</span>
              <span className={`tag tag-${s.state}`}>
                {s.state === 'overdue' ? `${s.overdueDays} day${s.overdueDays > 1 ? 's' : ''} late` : s.state === 'due' ? 'Due today' : `Due ${s.dueDate}`}
              </span>
              <button type="button" onClick={() => complete(chore.id)} disabled={s.state === 'upcoming'}>
                Done
              </button>
            </div>
          )
        })}
      </section>

      <footer className="dev-note">
        Scaffold screen · account: {account === 'none' ? 'add Supabase keys to .env' : account}
      </footer>
    </main>
  )
}
