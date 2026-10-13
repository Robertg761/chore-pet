import { useRef, useState } from 'react'
import { AnimatedCharacterArt } from '../character/AnimatedCharacter'
import { ACTION_MS, sampleMotion } from '../character/motion'
import type { PoseName } from '../character/poses'
import type { Pet } from '../domain/types'
import { usePetMotion } from '../pet/usePetMotion'
import { SegThumb } from '../shell/SegThumb'
import { describeOutfit, WARDROBE_POSES } from './wardrobeModel'

type PreviewAction = 'greet' | 'affection' | 'celebrate' | 'stretch' | 'rest'
interface PreviewRun { action: PreviewAction; start: number; paused: boolean }

/** One finite, on-demand clock, isolated from the wardrobe's item grid. */
export function WardrobePreview({ pet }: { pet: Pet }) {
  const preview = useRef<SVGSVGElement>(null)
  const [pose, setPose] = useState<PoseName>('idle')
  const [mirrored, setMirrored] = useState(false)
  const [run, setRun] = useState<PreviewRun | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const { reducedMotion } = usePetMotion((now, reduced) => {
    if (!run || run.paused) return
    const time = Math.max(0, now - run.start)
    if (reduced || time >= ACTION_MS[run.action]) setRun(null)
    else setElapsed(time)
  }, run !== null && !run.paused, reduced => { if (reduced) setRun(null) })
  const active = reducedMotion ? null : run
  const frame = sampleMotion({ species: pet.species, mood: pose === 'sick' ? 'sick' : 'happy',
    action: active?.action ?? 'idle', elapsedMs: active ? elapsed : 0, distance: 0,
    durationMs: active ? ACTION_MS[active.action] : ACTION_MS.idle, reducedMotion: reducedMotion || !active })

  function showPreview() {
    preview.current?.scrollIntoView({ block: 'center', behavior: 'instant' })
    preview.current?.focus({ preventScroll: true })
  }

  function stop() { setRun(null) }
  function pausePreview() {
    if (reducedMotion || !run) return
    setRun(run.paused ? { ...run, start: performance.now() - elapsed, paused: false } : { ...run, paused: true })
  }
  function toggle(action: PreviewAction) {
    if (reducedMotion) return
    if (run?.action === action) { stop(); return }
    if (run) return
    const next = { action, start: performance.now(), paused: false }
    setPose('idle')
    setElapsed(0)
    setRun(next)
  }

  return <div className="wd-stage">
    <button type="button" className="btn choice wd-pause-preview" disabled={reducedMotion || !active}
      aria-label={`${active?.paused ? 'Resume' : 'Pause'} movement preview of ${pet.name}`}
      title={active ? active.paused ? 'Resume preview' : 'Pause preview' : reducedMotion ? 'Motion previews are off' : 'Choose a movement to pause'}
      onClick={pausePreview}>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="currentColor">
        {active?.paused ? <path d="M8 4 20 12 8 20Z" /> : <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>}
      </svg>
    </button>
    <button type="button" className="btn choice wd-mirror-preview" aria-label={`Mirror preview of ${pet.name}`}
      aria-pressed={mirrored} title="Mirror preview" onClick={() => setMirrored(value => !value)}>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v18" strokeDasharray="2 3" />
          <path d="m8 7-5 5 5 5M3 12h6m7-5 5 5-5 5m5-5h-6" />
        </g>
      </svg>
    </button>
    <svg ref={preview} className="wd-preview" tabIndex={-1} viewBox="0 0 200 200" role="img" aria-label={`${pet.name} wearing ${describeOutfit(pet.equipped)}${mirrored ? ", mirrored preview" : ""}`} focusable="true">
      <g data-preview-facing={mirrored ? 'mirrored' : 'normal'} transform={mirrored ? 'translate(200 0) scale(-1 1)' : undefined}>
      <AnimatedCharacterArt species={pet.species} mood={pose === 'sick' ? 'sick' : 'happy'} pose={pose}
        bodyColour={pet.bodyColour} equipped={pet.equipped} look={{ eyes: pet.eyes, cheeks: pet.cheeks }} frame={frame} />
      </g>
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
      <button type="button" className="btn btn-sm" disabled={reducedMotion || Boolean(active && active.action !== 'rest')}
        onClick={() => toggle('rest')}>{active?.action === 'rest' ? 'Stop rest' : 'Rest'}</button>
    </div>
    <button type="button" className="btn btn-sm btn-quiet wd-show-preview" aria-label={`Show preview of ${pet.name}`} onClick={showPreview}>Show preview</button>
    {reducedMotion && <p className="wd-note wd-motion-note">Motion previews are off while reduced motion is on.</p>}
  </div>
}
