import { useState } from 'react'
import { AnimatedCharacterArt } from '../character/AnimatedCharacter'
import { ACTION_MS, sampleMotion } from '../character/motion'
import type { PoseName } from '../character/poses'
import type { Pet } from '../domain/types'
import { usePetMotion } from '../pet/usePetMotion'
import { SegThumb } from '../shell/SegThumb'
import { describeOutfit, WARDROBE_POSES } from './wardrobeModel'

type PreviewAction = 'greet' | 'affection' | 'celebrate' | 'stretch'
interface PreviewRun { action: PreviewAction; start: number }

/** One finite, on-demand clock, isolated from the wardrobe's item grid. */
export function WardrobePreview({ pet }: { pet: Pet }) {
  const [pose, setPose] = useState<PoseName>('idle')
  const [run, setRun] = useState<PreviewRun | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const { reducedMotion } = usePetMotion((now, reduced) => {
    if (!run) return
    const time = Math.max(0, now - run.start)
    if (reduced || time >= ACTION_MS[run.action]) setRun(null)
    else setElapsed(time)
  }, run !== null, reduced => { if (reduced) setRun(null) })
  const active = reducedMotion ? null : run
  const frame = sampleMotion({ species: pet.species, mood: pose === 'sick' ? 'sick' : 'happy',
    action: active?.action ?? 'idle', elapsedMs: active ? elapsed : 0, distance: 0,
    durationMs: active ? ACTION_MS[active.action] : ACTION_MS.idle, reducedMotion: reducedMotion || !active })

  function stop() { setRun(null) }
  function toggle(action: PreviewAction) {
    if (reducedMotion) return
    if (run?.action === action) { stop(); return }
    if (run) return
    const next = { action, start: performance.now() }
    setPose('idle')
    setElapsed(0)
    setRun(next)
  }

  return <div className="wd-stage">
    <svg className="wd-preview" viewBox="0 0 200 200" role="img" aria-label={`${pet.name} wearing ${describeOutfit(pet.equipped)}`} focusable="false">
      <AnimatedCharacterArt species={pet.species} mood={pose === 'sick' ? 'sick' : 'happy'} pose={pose}
        bodyColour={pet.bodyColour} equipped={pet.equipped} look={{ eyes: pet.eyes, cheeks: pet.cheeks }} frame={frame} />
    </svg>
    <div className="wd-poses seg" role="group" aria-label="Pose">
      <SegThumb />
      {WARDROBE_POSES.map(choice => <button key={choice.pose} type="button" className="seg-btn" aria-pressed={pose === choice.pose}
        onClick={() => { stop(); setPose(choice.pose) }}>{choice.label}</button>)}
    </div>
    <div className="wd-motion" role="group" aria-label="Movement preview">
      <button type="button" className="btn btn-sm" disabled={reducedMotion || Boolean(active && active.action !== 'greet')}
        onClick={() => toggle('greet')}>{active?.action === 'greet' ? 'Stop wave' : 'Wave'}</button>
      <button type="button" className="btn btn-sm" disabled={reducedMotion || Boolean(active && active.action !== 'affection')}
        onClick={() => toggle('affection')}>{active?.action === 'affection' ? 'Stop pats' : 'Gentle pats'}</button>
      <button type="button" className="btn btn-sm" disabled={reducedMotion || Boolean(active && active.action !== 'celebrate')}
        onClick={() => toggle('celebrate')}>{active?.action === 'celebrate' ? 'Stop hop' : 'Hop'}</button>
      <button type="button" className="btn btn-sm" disabled={reducedMotion || Boolean(active && active.action !== 'stretch')}
        onClick={() => toggle('stretch')}>{active?.action === 'stretch' ? 'Stop stretch' : 'Stretch'}</button>
    </div>
    {reducedMotion && <p className="wd-note wd-motion-note">Motion previews are off while reduced motion is on.</p>}
  </div>
}
