import { memo } from 'react'
import { CharacterArt } from '../character/Character'
import { SPECIES_COLOUR } from '../art/palette'
import { SAMPLE_KITCHEN } from '../content/sampleHome'
import type { MessStage, PlacedObject, Species } from '../domain/types'
import type { NeglectLevel } from '../domain/neglect'
import { Room } from '../room/Room'
import { PET_STROKE_SCALE } from '../room/shell/geometry'
import './LandingScene.css'

// The landing's hero picture: the real kitchen from the sample home, drawn by
// the app's own room renderer with static props (no store, no input). One
// thing is a little messy, the sink, so a visitor sees the whole idea at once:
// a home, a chore that is waiting, and the pet that lives there.

const ROOM = { floorStyle: 'wood', wallStyle: 'peach' }

// The sample kitchen, with the sink out from the corner so its dishes show, the table and rug
// in the middle of the floor and a plant on the far wall, so the whole room is lived in rather than just its back corner.
const MOVED: Record<string, { tileX: number; tileY: number }> = {
  stove: { tileX: 0, tileY: 1 },
  sink: { tileX: 0, tileY: 2 },
  rug: { tileX: 4, tileY: 3 },
  table: { tileX: 4, tileY: 3 },
}
const SPOTS = [...SAMPLE_KITCHEN.map((s) => ({ ...s, ...MOVED[s.catalogId] })), { catalogId: 'plant', tileX: 5, tileY: 0, rotation: 0 as const }]
const OBJECTS: PlacedObject[] = SPOTS.map((spot, i) => ({ id: `hero-${i}`, roomId: 'hero', ...spot }))
const sinkId = OBJECTS.find((o) => o.catalogId === 'sink')!.id
const STAGES: Record<string, MessStage> = { [sinkId]: 'messy2' }
const NEGLECT: Record<string, NeglectLevel> = { [sinkId]: 2 }

/** In the open floor in front of the kitchen, clear of the sink so its dishes show. */
const PET_TILE = { tx: 2.1, ty: 4.1 }

/** Decorative: the kitchen with the chosen pet gently idling in it. */
export const LandingScene = memo(function LandingScene({ species }: { species: Species }) {
  return (
    <div className="landing-scene" aria-hidden="true">
      <Room
        room={ROOM}
        objects={OBJECTS}
        stages={STAGES}
        neglect={NEGLECT}
        className="landing-scene-room"
        pet={{
          tile: PET_TILE,
          facing: -1,
          art: <CharacterArt key={species} species={species} mood="happy" bodyColour={SPECIES_COLOUR[species]} strokeScale={PET_STROKE_SCALE} />,
        }}
      />
    </div>
  )
})
