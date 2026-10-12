import { useId, useRef, useState } from 'react'
import { PALETTE, SPECIES_COLOUR } from '../art/palette'
import { AnimatedCharacterArt } from '../character/AnimatedCharacter'
import { ITEMS } from '../character/items'
import { ACTION_MS, sampleMotion, type MotionAction, type MotionFrame } from '../character/motion'
import { CHARACTER_SLOTS, CHEEK_STYLES, EYE_STYLES, SPECIES, type CheekStyle, type CharacterSlot, type EyeStyle, type Mood, type Species } from '../domain/types'
import { usePetMotion } from '../pet/usePetMotion'
import { usePetVisibility } from '../pet/usePetVisibility'
import { PET_STROKE_SCALE } from '../room/shell/geometry'
import './MotionReview.css'

const MOODS: Mood[] = ['happy', 'content', 'meh', 'scruffy', 'sick']
const COLORS = {
  default: { label: 'Species default', value: '' },
  yellow: { label: 'Yellow', value: PALETTE.petDefault },
  pink: { label: 'Pink', value: PALETTE.sakura },
  sky: { label: 'Sky', value: PALETTE.sky },
  white: { label: 'White', value: PALETTE.white },
  dark: { label: 'Dark ink', value: PALETTE.ink },
}

export default function MotionReview() {
  const headingId = useId()
  const notesId = useId()
  const [species, setSpecies] = useState<Species>('mochi')
  const [mood, setMood] = useState<Mood>('happy')
  const [action, setAction] = useState<MotionAction>('greet')
  const [color, setColor] = useState<keyof typeof COLORS>('default')
  const [eyes, setEyes] = useState<EyeStyle>('classic')
  const [cheeks, setCheeks] = useState<CheekStyle>('round')
  const [equipped, setEquipped] = useState<Partial<Record<CharacterSlot, string>>>({})
  const [elapsedMs, setElapsedMs] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loop, setLoop] = useState(false)
  const [facing, setFacing] = useState<1 | -1>(1)
  const [speed, setSpeed] = useState(1)
  const [reduce, setReduce] = useState(false)
  const [ground, setGround] = useState(false)
  const [anchor, setAnchor] = useState(false)
  const previousTick = useRef<number | null>(null)
  const playTime = useRef(0)
  const previewNode = useRef<HTMLDivElement>(null)
  const inView = usePetVisibility(previewNode)
  const durationMs = ACTION_MS[action]
  // Study the whole blink pattern without changing the sampler's body cycle.
  const reviewSpanMs = action === 'idle' ? 12000 : durationMs
  const { reducedMotion: preferredReducedMotion } = usePetMotion((now) => {
    const delta = previousTick.current === null ? 0 : Math.max(0, now - previousTick.current)
    previousTick.current = now
    const time = playTime.current + delta * speed
    playTime.current = loop ? time % reviewSpanMs : Math.min(reviewSpanMs, time)
    setElapsedMs(Math.round(playTime.current))
    if (!loop && playTime.current >= reviewSpanMs) {
      setPlaying(false)
      previousTick.current = null
    }
  }, playing && inView, undefined, () => { previousTick.current = null })
  const reducedMotion = reduce || preferredReducedMotion

  function seek(value: number, limit = reviewSpanMs) {
    const time = Number.isFinite(value) ? Math.round(Math.max(0, Math.min(limit, value))) : 0
    setPlaying(false)
    previousTick.current = null
    playTime.current = time
    setElapsedMs(time)
  }

  function togglePlay() {
    previousTick.current = null
    if (!playing && elapsedMs >= reviewSpanMs) {
      playTime.current = 0
      setElapsedMs(0)
    } else {
      playTime.current = elapsedMs
    }
    setPlaying(!playing)
  }

  function frameAt(time: number): MotionFrame {
    return sampleMotion({ species, mood, action, elapsedMs: time, durationMs,
      distance: action === 'walk' ? time / durationMs * 2 : 0, facing, reducedMotion })
  }

  const frame = frameAt(elapsedMs)
  const bodyColour = COLORS[color].value || SPECIES_COLOUR[species]
  const look = { eyes, cheeks }
  const jumping = action === 'celebrate' || action === 'celebrate-big'
  const pairedBlinkStart = { bun: 9000, mochi: 7300, sprout: 5700 }[species]
  const keyFrames = action === 'idle' ? [
    { label: 'Start', time: 0 },
    { label: 'Primary blink', time: pairedBlinkStart + 70 },
    { label: 'Between blinks', time: pairedBlinkStart + 170 },
    { label: 'Second blink', time: pairedBlinkStart + 270 },
    { label: 'Recovery', time: reviewSpanMs },
  ] : [
    { label: 'Start', time: 0 },
    { label: action === 'walk' ? 'Early cycle' : 'Anticipation', time: Math.round(durationMs * 0.1) },
    { label: jumping ? 'Lift' : 'Action', time: Math.round(durationMs * 0.42) },
    { label: jumping ? 'Landing / compression' : 'Settle', time: Math.round(durationMs * 0.76) },
    { label: 'Recovery', time: durationMs },
  ]

  function preview(size: number, sampled: MotionFrame, label: string, overlays = false) {
    return (
      <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={label}>
        <g data-review-facing={facing} transform={facing === -1 ? 'translate(200 0) scale(-1 1)' : undefined}>
          <AnimatedCharacterArt species={species} mood={mood} bodyColour={bodyColour} equipped={equipped} look={look} frame={sampled} strokeScale={size === 25 ? PET_STROKE_SCALE : 1} />
        </g>
        {overlays && <g aria-hidden="true" pointerEvents="none" fill="none" stroke={PALETTE.accent} strokeWidth={1}>
          {ground && <path data-review-overlay="ground" d="M 0 181 H 200" strokeDasharray="4 3" />}
          {anchor && <g data-review-overlay="anchor">
            <circle cx={100} cy={181} r={4} />
            <path d="M 92 181 H 108 M 100 173 V 189" />
          </g>}
        </g>}
      </svg>
    )
  }

  return (
    <section className="motion-review" aria-labelledby={headingId}>
      <h2 id={headingId}>Deterministic motion review</h2>
      <p>Production sampler and character art. Scrubbing pauses playback. Settings stay in this panel.</p>
      <fieldset className="motion-review-controls">
        <legend>Character and action</legend>
        <label>Species<select value={species} onChange={(event) => setSpecies(event.target.value as Species)}>{SPECIES.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Mood<select value={mood} onChange={(event) => setMood(event.target.value as Mood)}>{MOODS.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Facing<select value={facing === -1 ? 'left' : 'right'} onChange={(event) => setFacing(event.target.value === 'left' ? -1 : 1)}>
          <option value="right">Right</option><option value="left">Left</option>
        </select></label>
        <label>Action<select value={action} onChange={(event) => {
          const next = event.target.value as MotionAction
          seek(elapsedMs, next === 'idle' ? 12000 : ACTION_MS[next])
          setAction(next)
        }}>{(Object.keys(ACTION_MS) as MotionAction[]).map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Body color<select value={color} onChange={(event) => setColor(event.target.value as keyof typeof COLORS)}>{Object.entries(COLORS).map(([value, choice]) => <option key={value} value={value}>{choice.label}</option>)}</select></label>
        <label>Eyes<select value={eyes} onChange={(event) => setEyes(event.target.value as EyeStyle)}>{EYE_STYLES.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Cheeks<select value={cheeks} onChange={(event) => setCheeks(event.target.value as CheekStyle)}>{CHEEK_STYLES.map((value) => <option key={value}>{value}</option>)}</select></label>
      </fieldset>
      <fieldset className="motion-review-controls">
        <legend>Wardrobe</legend>
        {CHARACTER_SLOTS.map((slot) => <label key={slot}>{slot} slot<select value={equipped[slot] ?? ''} onChange={(event) => setEquipped({ ...equipped, [slot]: event.target.value })}>
          <option value="">{slot === 'body' ? 'Body color above' : 'None'}</option>
          {ITEMS.filter((item) => item.slot === slot).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>)}
      </fieldset>
      <fieldset className="motion-review-playback">
        <legend>Playback</legend>
        <div className="motion-review-buttons">
          <button type="button" onClick={togglePlay}>{playing ? 'Pause' : 'Play'}</button>
          <button type="button" onClick={() => seek(0)}>Restart</button>
          <button type="button" onClick={() => seek(elapsedMs - 16)}>Back 16 ms</button>
          <button type="button" onClick={() => seek(elapsedMs + 16)}>Forward 16 ms</button>
          <label>Playback speed<select value={speed} onChange={(event) => { previousTick.current = null; setSpeed(Number(event.target.value)) }}>
            <option value={1}>1×</option><option value={0.5}>0.5×</option><option value={0.25}>0.25×</option>
          </select></label>
        </div>
        <label className="motion-review-loop"><input type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} />Loop playback</label>
        <p>Action duration: {durationMs} ms. {playing ? inView ? 'Playing' : 'Waiting for preview visibility' : 'Paused'} at {elapsedMs} ms.</p>
        {action === 'idle' && <p>Idle review spans 12000 ms: one full blink pattern and three 4-second breathing cycles.</p>}
        <label>Time scrubber<input type="range" min={0} max={reviewSpanMs} step={1} value={elapsedMs} aria-valuetext={`${elapsedMs} milliseconds`} onChange={(event) => seek(Number(event.target.value))} /></label>
        <label>Elapsed milliseconds<input type="number" min={0} max={reviewSpanMs} step={1} value={elapsedMs} onChange={(event) => seek(event.target.valueAsNumber)} /></label>
        {action === 'walk' && <p>Walk preview covers two tiles over {durationMs} ms. Distance drives the production gait.</p>}
      </fieldset>
      <fieldset className="motion-review-overlays" aria-describedby={notesId}>
        <legend>Review overlays and motion preference</legend>
        <label><input type="checkbox" checked={ground} onChange={(event) => setGround(event.target.checked)} />Ground line</label>
        <label><input type="checkbox" checked={anchor} onChange={(event) => setAnchor(event.target.checked)} />Ground anchor</label>
        <label><input type="checkbox" disabled checked={false} readOnly />Contact target, unavailable</label>
        <label><input type="checkbox" checked={reduce} onChange={(event) => setReduce(event.target.checked)} />Force reduced motion in this panel</label>
      </fieldset>
      <p id={notesId}>Ground line and pivot anchor use sampler coordinates y=181 and (100,181). No furniture contact target is supplied by this standalone preview. Overlays appear only on the close-up. {preferredReducedMotion && 'Reduced motion is active.'}</p>
      <div className="motion-review-previews" ref={previewNode}>
        {[200, 60, 25].map((size) => <figure key={size}>
          <div className="motion-review-stage">{preview(size, frame, `${species}, ${mood}, ${action} at ${elapsedMs} ms, ${size}px`, size === 200)}</div>
          <figcaption>{size}px{size === 25 ? ' · fit-home' : size === 60 ? ' · room check' : ' · close-up'}</figcaption>
        </figure>)}
      </div>
      <h3>Key frames</h3>
      <p>Sampled comparisons, not contact geometry. Choose a frame to pause there.</p>
      <div className="motion-review-keyframes">
        {keyFrames.map(({ label, time }) => <button key={label} type="button" onClick={() => seek(time)} aria-label={`${label}, ${time} milliseconds`}>
          {preview(100, frameAt(time), `${label} at ${time} ms`)}
          <span>{label}</span><span>{time} ms</span>
        </button>)}
      </div>
    </section>
  )
}
