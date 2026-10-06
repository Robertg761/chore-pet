import { useEffect, useState } from 'react'
import { PALETTE, SPECIES_COLOUR } from '../art/palette'
import { Character, CharacterArt } from '../character/Character'
import { Cheer } from '../effects/Cheer'
import { Sparkle } from '../effects/Sparkle'
import { POSES, type PoseName } from '../character/poses'
import { CHEEK_STYLES, EYE_STYLES, SPECIES, type CharacterSlot, type MessStage, type Mood } from '../domain/types'
import { isoPoints } from '../room/iso'
import { OBJECT_ART } from '../room/objects'
import { OBJECT_SCALE, tileCorner } from '../room/shell/geometry'
import { RoomShell } from '../room/shell/RoomShell'
import { FLOOR_STYLES, WALL_STYLES } from '../room/shell/styles'
import type { ObjectArt } from '../room/objects/types'
import { WeekView } from '../screens/WeekView'
import type { Chore, Completion } from '../domain/types'

// Dev-only review sheet (open /?art). Every species in every mood, items on
// every pose, objects in every mess stage. Use it to check new art against
// docs/ART.md before it lands.

const MOODS: Mood[] = ['happy', 'content', 'meh', 'scruffy', 'sick']
const STAGES: MessStage[] = ['clean', 'messy1', 'messy2']
const OBJECTS: ObjectArt[] = Object.values(OBJECT_ART)

function ObjectTile({ art, stage, scale }: { art: ObjectArt; stage: MessStage; scale: number }) {
  const { x, y, width, height } = art.bounds
  const { w, d } = art.footprint
  return (
    <svg width={width * scale} height={height * scale} viewBox={`${x} ${y} ${width} ${height}`} role="img" aria-label={`${art.catalogId}, ${stage}`}>
      <rect x={x} y={y} width={width} height={height} fill="none" stroke={PALETTE.accent} strokeDasharray="2 2" strokeWidth={0.5} />
      <polygon points={isoPoints([0, 0, 0], [w, 0, 0], [w, d, 0], [0, d, 0])} fill={PALETTE.floorWood} opacity={0.5} />
      {art.render(stage)}
    </svg>
  )
}

export default function ArtGallery() {
  const poseNames = (s: (typeof SPECIES)[number]) => Object.keys(POSES[s]) as PoseName[]
  return (
    <main className="gallery">
      <h1>Art gallery</h1>

      <h2>Close-up</h2>
      <section className="gallery-row">
        {SPECIES.map((s) => (
          <Character key={s} species={s} mood="happy" bodyColour={SPECIES_COLOUR[s]} size={300} />
        ))}
      </section>

      <h2>Pets by mood</h2>
      {SPECIES.map((s) => (
        <section key={s} className="gallery-row">
          <h3>{s}</h3>
          {MOODS.map((m) => (
            <figure key={m}>
              <Character species={s} mood={m} bodyColour={SPECIES_COLOUR[s]} size={150} />
              <figcaption>{m}</figcaption>
            </figure>
          ))}
        </section>
      ))}

      <h2>Items on every pose</h2>
      {SPECIES.map((s) => (
        <section key={s} className="gallery-row">
          <h3>{s}</h3>
          {poseNames(s).map((p) => (
            <figure key={p}>
              <Character species={s} mood="happy" pose={p} bodyColour={SPECIES_COLOUR[s]} equipped={{ head: 'beanie-red' }} size={150} />
              <figcaption>{p} + beanie</figcaption>
            </figure>
          ))}
        </section>
      ))}

      <h2>Readable at 60px</h2>
      <section className="gallery-row">
        {SPECIES.flatMap((s) =>
          MOODS.map((m) => <Character key={s + m} species={s} mood={m} bodyColour={SPECIES_COLOUR[s]} size={60} />),
        )}
      </section>

      <h2>Every pose on every body colour</h2>
      {SPECIES.map((s) => (
        <section key={s} className="gallery-row">
          <h3>{s}</h3>
          {[SPECIES_COLOUR[s], PALETTE.petDefault, PALETTE.blush, PALETTE.sky, PALETTE.white].filter((c, i, all) => all.indexOf(c) === i).flatMap((c) =>
            poseNames(s).map((p) => <Character key={c + p} species={s} mood={p === 'idle' || p === 'sleeping' || p === 'cheering' ? 'happy' : p} pose={p} bodyColour={c} size={90} />),
          )}
        </section>
      ))}

      <h2>Objects</h2>
      {OBJECTS.map((o) => (
        <section key={o.catalogId} className="gallery-row">
          <h3>{o.catalogId}</h3>
          {STAGES.map((st) => (
            <figure key={st}>
              <ObjectTile art={o} stage={st} scale={2.5} />
              <figcaption>{st}</figcaption>
            </figure>
          ))}
          {STAGES.map((st) => (
            <ObjectTile key={'s' + st} art={o} stage={st} scale={56.67 / 64} />
          ))}
        </section>
      ))}

      <h2>Room shell</h2>
      <section className="gallery-row">
        <h3>Default room with the sink at tile (0, 2)</h3>
        <RoomShell floorStyle="wood" wallStyle="peach" width={520}>
          <g transform={`translate(${tileCorner(0, 2).x} ${tileCorner(0, 2).y}) scale(${OBJECT_SCALE})`}>{OBJECT_ART.sink.render('clean')}</g>
        </RoomShell>
      </section>
      <section className="gallery-row">
        <h3>Floor x wall styles</h3>
        {FLOOR_STYLES.flatMap((f) =>
          WALL_STYLES.map((w) => (
            <figure key={f.id + w.id}>
              <RoomShell floorStyle={f.id} wallStyle={w.id} width={260} />
              <figcaption>
                {f.id} + {w.id}
              </figcaption>
            </figure>
          )),
        )}
      </section>

      <EffectsSection />
      <WeekViewSection />
      <WardrobeCheck />
      <FaceOptions />
    </main>
  )
}

/** Bumps every `ms` so effects keyed on it replay forever. */
function useReplay(ms: number) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setN((v) => v + 1), ms)
    return () => clearInterval(t)
  }, [ms])
  return n
}

function EffectsSection() {
  const sparkleRun = useReplay(2000)
  const cheerRun = useReplay(2500)
  const sink = OBJECT_ART.sink
  // The sink's top, in room px around its back corner; the sparkle sits just above the counter.
  const sparkleAt = { x: 0, y: -22 * OBJECT_SCALE }
  return (
    <>
      <h2>Effects</h2>
      <section className="gallery-row">
        <figure>
          <svg width={220} height={200} viewBox="-70 -90 140 128" style={{ overflow: 'visible' }} role="img" aria-label="Sparkle over the sink">
            <g transform={`scale(${OBJECT_SCALE})`}>{sink.render('clean')}</g>
            <Sparkle key={sparkleRun} x={sparkleAt.x} y={sparkleAt.y} size={56.67} />
          </svg>
          <figcaption>sparkle, replays every 2 s</figcaption>
        </figure>
        {SPECIES.map((s) => (
          <figure key={s}>
            <svg width={220} height={260} viewBox="-10 -60 220 260" style={{ overflow: 'visible' }} role="img" aria-label={`${s} cheering`}>
              <Cheer key={cheerRun}>
                <CharacterArt species={s} mood="happy" pose="cheering" bodyColour={SPECIES_COLOUR[s]} />
              </Cheer>
            </svg>
            <figcaption>{s} cheer, replays every 2.5 s</figcaption>
          </figure>
        ))}
      </section>
    </>
  )
}

// Sample week for the week view: a fixed "today" so the picture never changes.
const WEEK_TODAY = '2026-10-07'
const weekChore = (id: string, name: string, createdOn: string): Chore => ({
  id,
  homeId: 'sample',
  objectId: null,
  name,
  schedule: { kind: 'daily' },
  createdOn,
  photoProof: false,
})
const weekDone = (choreId: string, on: string): Completion => ({
  id: `${choreId}-${on}`,
  choreId,
  completedAt: `${on}T09:00:00.000Z`,
  completedOn: on,
})
const WEEK_CHORES = [weekChore('dishes', 'Dishes', '2026-09-20'), weekChore('bed', 'Make the bed', '2026-09-20'), weekChore('plants', 'Water plants', '2026-10-03')]
const WEEK_DONE: Completion[] = [
  ...['2026-10-01', '2026-10-02', '2026-10-06', '2026-10-07'].map((d) => weekDone('dishes', d)),
  ...['2026-10-01', '2026-10-06', '2026-10-07'].map((d) => weekDone('bed', d)),
  ...['2026-10-05', '2026-10-06'].map((d) => weekDone('plants', d)),
]
const WEEK_AWAY = [{ start: '2026-10-03', end: '2026-10-04' }]

function WeekViewSection() {
  return (
    <>
      <h2>Week view</h2>
      <section className="gallery-row">
        <figure style={{ width: 390, maxWidth: '100%' }}>
          <WeekView chores={WEEK_CHORES} completions={WEEK_DONE} vacations={WEEK_AWAY} today={WEEK_TODAY} />
          <figcaption>busy week with a break</figcaption>
        </figure>
        <figure style={{ width: 390, maxWidth: '100%' }}>
          <WeekView chores={WEEK_CHORES} completions={[]} vacations={[]} today={WEEK_TODAY} />
          <figcaption>quiet week, nothing done</figcaption>
        </figure>
      </section>
    </>
  )
}

const WARDROBE_POSES: PoseName[] = ['idle', 'content', 'meh', 'scruffy', 'sick', 'sleeping', 'cheering']
const WARDROBE_ROWS: { label: string; equipped: Partial<Record<CharacterSlot, string>> }[] = [
  { label: 'bow', equipped: { head: 'bow' } },
  { label: 'glasses', equipped: { face: 'glasses' } },
  { label: 'scarf', equipped: { neck: 'scarf' } },
  { label: 'bow tie', equipped: { neck: 'bow-tie' } },
  { label: 'backpack', equipped: { back: 'backpack' } },
  { label: 'hoodie', equipped: { outfit: 'hoodie' } },
  { label: 'overalls', equipped: { outfit: 'overalls' } },
  { label: 'dress', equipped: { outfit: 'dress' } },
  { label: 'knit sweater', equipped: { outfit: 'knit-sweater' } },
  { label: 'leaf crown', equipped: { head: 'leaf-crown' } },
  { label: 'hoodie + scarf + beanie', equipped: { outfit: 'hoodie', neck: 'scarf', head: 'beanie-red' } },
  { label: 'overalls + bow tie + bow', equipped: { outfit: 'overalls', neck: 'bow-tie', head: 'bow', face: 'glasses' } },
  { label: 'dress + bow', equipped: { outfit: 'dress', head: 'bow' } },
  { label: 'sweater + crown + pack', equipped: { outfit: 'knit-sweater', head: 'leaf-crown', back: 'backpack' } },
  { label: 'everything on', equipped: { head: 'bow', face: 'glasses', neck: 'scarf', back: 'backpack' } },
]

/** Every item, one at a time, on every pose of every species, plus an "everything on" row. */
function WardrobeCheck() {
  const cell = 110
  return (
    <>
      <h2>Wardrobe check</h2>
      {SPECIES.map((s) => (
        <section key={s} className="gallery-row" style={{ display: 'grid', gridTemplateColumns: `80px repeat(${WARDROBE_POSES.length}, ${cell}px)`, gap: 4, alignItems: 'center' }}>
          <h3 style={{ gridColumn: '1 / -1' }}>{s}</h3>
          <span />
          {WARDROBE_POSES.map((p) => (
            <figcaption key={p} style={{ textAlign: 'center' }}>
              {p}
            </figcaption>
          ))}
          {WARDROBE_ROWS.flatMap((row) => [
            <figcaption key={row.label}>{row.label}</figcaption>,
            ...WARDROBE_POSES.map((p) => (
              <Character key={row.label + p} species={s} mood={p === 'idle' || p === 'sleeping' || p === 'cheering' ? 'happy' : p} pose={p} bodyColour={SPECIES_COLOUR[s]} equipped={row.equipped} size={cell} title={`${s} ${p} with ${row.label}`} />
            )),
          ])}
        </section>
      ))}
    </>
  )
}

/** Every eye style x cheek style per species on the idle pose, plus each eye style across all seven poses. */
function FaceOptions() {
  const cell = 100
  return (
    <>
      <h2>Face options</h2>
      {SPECIES.map((s) => (
        <section key={s} className="gallery-row" style={{ display: 'grid', gridTemplateColumns: `80px repeat(${CHEEK_STYLES.length}, ${cell}px)`, gap: 4, alignItems: 'center' }}>
          <h3 style={{ gridColumn: '1 / -1' }}>{s}: eyes x cheeks</h3>
          <span />
          {CHEEK_STYLES.map((c) => (
            <figcaption key={c} style={{ textAlign: 'center' }}>
              {c}
            </figcaption>
          ))}
          {EYE_STYLES.flatMap((e) => [
            <figcaption key={e}>{e}</figcaption>,
            ...CHEEK_STYLES.map((c) => (
              <Character key={e + c} species={s} mood="happy" bodyColour={SPECIES_COLOUR[s]} look={{ eyes: e, cheeks: c }} size={cell} title={`${s} with ${e} eyes and ${c} cheeks`} />
            )),
          ])}
        </section>
      ))}
      {SPECIES.map((s) => (
        <section key={s} className="gallery-row" style={{ display: 'grid', gridTemplateColumns: `80px repeat(${WARDROBE_POSES.length}, ${cell}px)`, gap: 4, alignItems: 'center' }}>
          <h3 style={{ gridColumn: '1 / -1' }}>{s}: eye styles on every pose</h3>
          <span />
          {WARDROBE_POSES.map((p) => (
            <figcaption key={p} style={{ textAlign: 'center' }}>
              {p}
            </figcaption>
          ))}
          {EYE_STYLES.flatMap((e) => [
            <figcaption key={e}>{e}</figcaption>,
            ...WARDROBE_POSES.map((p) => (
              <Character key={e + p} species={s} mood={p === 'idle' || p === 'sleeping' || p === 'cheering' ? 'happy' : p} pose={p} bodyColour={SPECIES_COLOUR[s]} look={{ eyes: e, cheeks: 'round' }} size={cell} title={`${s} ${p} with ${e} eyes`} />
            )),
          ])}
        </section>
      ))}
    </>
  )
}
