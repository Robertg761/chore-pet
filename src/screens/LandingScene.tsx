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

// The sample kitchen exactly as a visitor gets it (its own tests check every spot): a fitted run along
// both walls, the sink under the window, a dining table on a rug and a plant, so the whole room is lived in.
const SPOTS = SAMPLE_KITCHEN
const OBJECTS: PlacedObject[] = SPOTS.map((spot, i) => ({ id: `hero-${i}`, roomId: 'hero', ...spot }))
const sinkId = OBJECTS.find((o) => o.catalogId === 'sink')!.id
const STAGES: Record<string, MessStage> = { [sinkId]: 'messy2' }
const NEGLECT: Record<string, NeglectLevel> = { [sinkId]: 2 }

/** On the open floor at the front right, in full view and clear of the table and the sink's dishes. */
const PET_TILE = { tx: 5.6, ty: 5.3 }

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
