import { PALETTE } from '../art/palette'
import { Character } from '../character/Character'
import { POSES, type PoseName } from '../character/poses'
import { SPECIES, type MessStage, type Mood } from '../domain/types'
import { isoPoints } from '../room/iso'
import { sinkArt } from '../room/objects/sink'
import type { ObjectArt } from '../room/objects/types'

// Dev-only review sheet (open /?art). Every species in every mood, items on
// every pose, objects in every mess stage. Use it to check new art against
// docs/ART.md before it lands.

const MOODS: Mood[] = ['happy', 'content', 'meh', 'scruffy', 'sick']
const STAGES: MessStage[] = ['clean', 'messy1', 'messy2']
const OBJECTS: ObjectArt[] = [sinkArt]

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

      <h2>Pets by mood</h2>
      {SPECIES.map((s) => (
        <section key={s} className="gallery-row">
          <h3>{s}</h3>
          {MOODS.map((m) => (
            <figure key={m}>
              <Character species={s} mood={m} bodyColour={PALETTE.petDefault} size={150} />
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
              <Character species={s} mood="happy" pose={p} bodyColour={PALETTE.petDefault} equipped={{ head: 'beanie-red' }} size={150} />
              <figcaption>{p} + beanie</figcaption>
            </figure>
          ))}
        </section>
      ))}

      <h2>Readable at 60px</h2>
      <section className="gallery-row">
        {SPECIES.flatMap((s) =>
          MOODS.map((m) => <Character key={s + m} species={s} mood={m} bodyColour={PALETTE.petDefault} size={60} />),
        )}
      </section>

      <h2>Body colours</h2>
      <section className="gallery-row">
        {SPECIES.flatMap((s) =>
          [PALETTE.petDefault, PALETTE.blush, PALETTE.sky, PALETTE.white].map((c) => (
            <Character key={s + c} species={s} mood="happy" bodyColour={c} size={90} />
          )),
        )}
      </section>

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
    </main>
  )
}
