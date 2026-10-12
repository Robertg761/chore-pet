import { useState } from 'react'
import { SPECIES_COLOUR } from '../art/palette'
import { CharacterArt } from '../character/Character'
import { SPECIES } from '../domain/types'
import { Cheer } from '../effects/Cheer'
import { Sparkle } from '../effects/Sparkle'
import { OBJECT_ART } from '../room/objects'
import { OBJECT_SCALE } from '../room/shell/geometry'
import { usePetMotion } from '../pet/usePetMotion'

const noFrame = () => {}

/** Explicit finite replays replace repeating gallery effect timers. */
export default function EffectReview() {
  const [sparkleRun, setSparkleRun] = useState(0)
  const [cheerRun, setCheerRun] = useState(0)
  // A CSS media change can restart its fade timeline. Settle instead, so an
  // old finite deadline never cuts a newly restarted fade off midway.
  usePetMotion(noFrame, false, () => { setSparkleRun(0); setCheerRun(0) })
  const sink = OBJECT_ART.sink
  const sparkleAt = { x: 0, y: -22 * OBJECT_SCALE }
  return <>
    <h2>Effects</h2>
    <div className="gallery-effects-controls" role="group" aria-label="Effect replay controls">
      <button type="button" onClick={() => setSparkleRun((run) => run + 1)}>Replay sparkle</button>
      <button type="button" onClick={() => setCheerRun((run) => run + 1)}>Replay cheers</button>
    </div>
    <section className="gallery-row gallery-effects">
      <figure>
        <svg width={220} height={200} viewBox="-70 -90 140 128" style={{ overflow: 'visible' }} role="img" aria-label="Sparkle over the sink">
          <g transform={`scale(${OBJECT_SCALE})`}>{sink.render('clean')}</g>
          {sparkleRun > 0 && <Sparkle key={sparkleRun} x={sparkleAt.x} y={sparkleAt.y} size={56.67} onDone={() => setSparkleRun(0)} />}
        </svg>
        <figcaption>sparkle, replay on demand</figcaption>
      </figure>
      {SPECIES.map((s) => {
        const art = <CharacterArt species={s} mood="happy" pose="cheering" bodyColour={SPECIES_COLOUR[s]} />
        return <figure key={s}>
          <svg width={220} height={260} viewBox="-10 -60 220 260" style={{ overflow: 'visible' }} role="img" aria-label={`${s} cheering`}>
            {cheerRun > 0 ? <Cheer key={cheerRun} onDone={() => setCheerRun(0)}>{art}</Cheer> : art}
          </svg>
          <figcaption>{s} cheer, replay on demand</figcaption>
        </figure>
      })}
    </section>
  </>
}
