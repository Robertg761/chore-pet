// The demo video's sound track, made from the app's OWN sounds (src/audio/): nothing is recorded and
// no audio file is used.
//
// How it works (scripts/record-demo.mjs calls this; it also runs alone to re-mix a recording's events):
// - While recording, `interceptAudio` runs in every frame before the app. It swaps AudioContext for a
//   silent stand-in, so the app's real sound code (sfx.ts) runs untouched but plays nothing, and each
//   sound it starts is reported to Node by name (`window.__sfx`) with the real time it started, and
//   the recorder maps that onto the video the same way it maps frames (slow motion and time-lapses).
// - After recording, each sound is rendered once to PCM by running that same app code in a page whose
//   AudioContext is an OfflineAudioContext (`renderSounds`): the sound the app makes, sample for sample.
// - `buildTrack` places each sound at its video time at normal pitch (sounds are never stretched, so a
//   sped-up stretch just has them closer together), adds a few soft whooshes for the card and phone
//   transitions (filtered noise, synthesised here), normalises, and `muxAudio` adds the track to the
//   finished video with the video stream copied untouched.
//
//   node scripts/demo-audio.mjs events.json video.mp4 out.mp4     re-mix from a recording's events file
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { dirname } from 'node:path'

export const SAMPLE_RATE = 48000
export const SOUNDS = ['click', 'sparkle', 'chirp']

/**
 * Runs in every frame before the app. A stand-in AudioContext that makes no sound and reports each
 * sound the app starts: the app starts a sound by creating its oscillators in one go, so the first
 * oscillator of a burst (its wave and starting pitch) says which one it is.
 */
export function interceptAudio() {
  // The page's own clock may be faked or slowed later; this one is the real one, read at the moment of the sound.
  const realNow = Date.now.bind(Date)
  const param = (value = 0) => {
    const p = { value, setValueAtTime(v) { p.value = v; return p }, exponentialRampToValueAtTime() { return p }, linearRampToValueAtTime() { return p }, setTargetAtTime() { return p }, cancelScheduledValues() { return p } }
    return p
  }
  const node = (props = {}) => ({ connect: (to) => to, disconnect() {}, ...props })
  let burst = null
  const classify = (osc) => {
    const hz = osc.frequency.value
    if (osc.type === 'triangle' && Math.abs(hz - 720) < 5) return 'click'
    if (osc.type === 'sine' && Math.abs(hz - 523) < 6) return 'sparkle'
    if (osc.type === 'sine' && Math.abs(hz - 650) < 5) return 'chirp'
    return `unknown:${osc.type}:${hz.toFixed(1)}`
  }
  class Quiet {
    constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 48000; this.destination = node() }
    resume() { return Promise.resolve() }
    suspend() { return Promise.resolve() }
    close() { return Promise.resolve() }
    createBiquadFilter() { return node({ type: 'lowpass', frequency: param(), Q: param(), gain: param() }) }
    createGain() { return node({ gain: param(1) }) }
    createOscillator() {
      const osc = node({ type: 'sine', frequency: param(440), start() {}, stop() {} })
      if (!burst) {
        burst = osc
        queueMicrotask(() => {
          const first = burst
          burst = null
          try { window.__sfx?.(classify(first), realNow()) } catch { /* the recording goes on without it */ }
        })
      }
      return osc
    }
  }
  window.AudioContext = Quiet
  window.webkitAudioContext = Quiet
}

/** Runs before the app in the render page: the app's AudioContext becomes an offline one we can read back. */
function offlineContext(sampleRate) {
  class Offline extends OfflineAudioContext {
    constructor() { super(1, sampleRate * 2, sampleRate); window.__offline = this }
  }
  window.AudioContext = Offline
  window.webkitAudioContext = Offline
}

/**
 * The app's sounds as PCM: each one played from the art gallery's Sounds row (the app's own play())
 * into an OfflineAudioContext. A fresh page per sound, because the app keeps one context for good.
 */
export async function renderSounds(browser, appUrl) {
  const pcm = {}
  for (const name of SOUNDS) {
    const context = await browser.newContext({ serviceWorkers: 'block' })
    await context.route(/^https:\/\//, (route) => route.abort())
    await context.addInitScript(offlineContext, SAMPLE_RATE)
    const page = await context.newPage()
    await page.goto(`${appUrl}?art`, { waitUntil: 'load' })
    await page.getByRole('button', { name, exact: true }).click()
    const samples = await page.evaluate(() => window.__offline.startRendering().then((b) => Array.from(b.getChannelData(0))))
    await context.close()
    let end = samples.length
    while (end > 0 && Math.abs(samples[end - 1]) < 1e-5) end--
    if (end === 0) throw new Error(`the app's "${name}" sound rendered as silence`)
    pcm[name] = Float32Array.from(samples.slice(0, end + 240))
  }
  return pcm
}

// --- Whooshes: soft band-passed noise, swept up or down, for the transitions only ------------------
// seconds, sweep (Hz, start and end), and a seeded noise so every render is the same.
const WHOOSHES = {
  'intro-out': { seconds: 0.8, from: 260, to: 2400, attack: 0.4, level: 1 },
  'phone-out': { seconds: 0.55, from: 2000, to: 280, attack: 0.3, level: 0.85 },
  'outro-in': { seconds: 0.6, from: 380, to: 2600, attack: 0.5, level: 0.7 },
}

function whoosh({ seconds, from, to, attack, level }) {
  const n = Math.round(seconds * SAMPLE_RATE)
  const out = new Float32Array(n)
  let seed = 12345
  const noise = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647) * 2 - 1 }
  const q = 1 / 1.4
  let low = 0
  let band = 0
  let soft = 0
  for (let i = 0; i < n; i++) {
    const x = i / n
    const sweep = x * x * (3 - 2 * x)
    const fc = from * Math.pow(to / from, sweep)
    const f = 2 * Math.sin((Math.PI * fc) / SAMPLE_RATE)
    const input = noise()
    low += f * band
    const high = input - low - q * band
    band += f * high
    soft += 0.35 * (band - soft) // rounds off the top, like the app's own low-pass
    const env = x < attack ? Math.sin((Math.PI / 2) * (x / attack)) ** 2 : Math.cos((Math.PI / 2) * ((x - attack) / (1 - attack))) ** 2
    out[i] = soft * env
  }
  let peak = 0
  for (const v of out) peak = Math.max(peak, Math.abs(v))
  for (let i = 0; i < n; i++) out[i] = (out[i] / peak) * level
  return out
}

/** Sounds that would pile up are dropped: the same sound twice within `GAP` seconds keeps the first. */
const GAP = 0.06

export function planEvents(events, videoSeconds) {
  const kept = []
  const lastOf = {}
  return [...events].sort((a, b) => a.t - b.t).map((e) => {
    let skip = null
    if (e.t < 0 || e.t >= videoSeconds) skip = 'outside the video'
    else if (e.name.startsWith('unknown')) skip = 'unknown sound'
    else if (e.t - (lastOf[e.name] ?? -Infinity) < GAP) skip = 'within 60 ms of the same sound'
    if (!skip) { lastOf[e.name] = e.t; kept.push(e) }
    return { ...e, skip }
  })
}

const wavFile = (samples) => {
  const data = Buffer.alloc(44 + samples.length * 2)
  data.write('RIFF', 0); data.writeUInt32LE(36 + samples.length * 2, 4); data.write('WAVEfmt ', 8)
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22)
  data.writeUInt32LE(SAMPLE_RATE, 24); data.writeUInt32LE(SAMPLE_RATE * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34)
  data.write('data', 36); data.writeUInt32LE(samples.length * 2, 40)
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2)
  return data
}

const TARGET_LUFS = -16
const TARGET_PEAK_DB = -1.5 // leaves room for the AAC encoder's overshoot: the file stays under -1 dBFS

/** Integrated loudness of a wav in LUFS (EBU R128), measured by ffmpeg. */
function measureLufs(file) {
  const run = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' })
  const m = [...run.stderr.matchAll(/\n\s*I:\s*(-?[\d.]+)\s*LUFS/g)].at(-1)
  return m ? Number(m[1]) : null
}

/**
 * The mixed track as samples, plus what was done: sounds placed, the gain applied and the levels.
 * `events` and `marks` are { name, t } in video seconds.
 */
export function buildTrack({ pcm, events, marks, videoSeconds, work }) {
  const plan = planEvents(events, videoSeconds)
  const track = new Float32Array(Math.ceil((videoSeconds + 0.5) * SAMPLE_RATE))
  const put = (samples, t, gain = 1) => {
    const at = Math.round(t * SAMPLE_RATE)
    for (let i = 0; i < samples.length && at + i < track.length; i++) track[at + i] += samples[i] * gain
  }
  // The app's own levels stay as they are; whooshes sit well under them.
  let appPeak = 0
  for (const s of Object.values(pcm)) for (const v of s) appPeak = Math.max(appPeak, Math.abs(v))
  const whooshes = marks.filter((m) => WHOOSHES[m.name] && m.t >= 0 && m.t < videoSeconds)
  for (const e of plan) if (!e.skip) put(pcm[e.name], e.t)
  for (const m of whooshes) put(whoosh(WHOOSHES[m.name]), m.t, appPeak * 0.3)

  mkdirSync(work, { recursive: true })
  const raw = `${work}/raw.wav`
  writeFileSync(raw, wavFile(track))
  const lufs = measureLufs(raw)
  let peak = 0
  for (const v of track) peak = Math.max(peak, Math.abs(v))
  const peakDb = 20 * Math.log10(peak)
  const wantLufs = lufs === null ? Infinity : TARGET_LUFS - lufs
  const wantPeak = TARGET_PEAK_DB - peakDb
  const gainDb = Math.min(wantLufs, wantPeak)
  const gain = Math.pow(10, gainDb / 20)
  for (let i = 0; i < track.length; i++) track[i] *= gain
  const out = `${work}/track.wav`
  writeFileSync(out, wavFile(track))
  return {
    wav: out,
    plan,
    whooshes,
    levels: { rawLufs: lufs, rawPeakDb: peakDb, gainDb, finalLufs: measureLufs(out), finalPeakDb: peakDb + gainDb, limitedBy: wantPeak < wantLufs ? 'peak' : 'loudness' },
  }
}

/** Add the track to the video: video stream copied, audio as AAC 160k. Replaces `video` unless `out` is given. */
export function muxAudio({ video, wav, out = video }) {
  const temp = `${out}.mux.mp4`
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k',
    '-af', 'pan=stereo|c0=c0|c1=c0,apad', '-shortest', '-movflags', '+faststart', temp])
  renameSync(temp, out)
}

const stamp = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`

/** A readable list of what plays when, and a picture of the waveform. */
export function writeReport({ result, base, video }) {
  const lines = [
    ...result.plan.map((e) => `${stamp(e.t)}  ${e.name.padEnd(8)}${e.skip ? `  (skipped: ${e.skip})` : ''}`),
    ...result.whooshes.map((m) => `${stamp(m.t)}  whoosh   (${m.name})`),
  ].sort()
  const l = result.levels
  lines.push('', `loudness before gain ${l.rawLufs} LUFS, peak ${l.rawPeakDb.toFixed(1)} dBFS; gain ${l.gainDb.toFixed(1)} dB (limited by ${l.limitedBy}); after: ${l.finalLufs} LUFS, peak ${l.finalPeakDb.toFixed(1)} dBFS`)
  writeFileSync(`${base}.audio-timeline.txt`, `${lines.join('\n')}\n`)
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-filter_complex', 'aformat=channel_layouts=mono,showwavespic=s=1600x300:colors=#6f5cf0', '-frames:v', '1', `${base}.audio-waveform.png`])
  return lines
}

/** Everything after the recording: render the sounds, build the track, mux it, report. Returns the report lines. */
export async function addSound({ browser, appUrl, events, marks, video, work, base }) {
  const pcm = await renderSounds(browser, appUrl)
  const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]).toString())
  const result = buildTrack({ pcm, events, marks, videoSeconds: seconds, work })
  muxAudio({ video, wav: result.wav })
  const lines = writeReport({ result, base, video })
  rmSync(work, { recursive: true, force: true })
  return lines
}

// Re-mix from a saved events file: node scripts/demo-audio.mjs events.json video.mp4 out.mp4
if (import.meta.url === `file://${process.argv[1]}`) {
  const { launchBrowser, serveApp } = await import('./media-common.mjs')
  const [eventsFile, source, out] = process.argv.slice(2)
  const { events, marks } = JSON.parse(readFileSync(eventsFile, 'utf8'))
  mkdirSync(dirname(out), { recursive: true })
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', source, '-map', '0:v:0', '-c:v', 'copy', '-an', out])
  const app = await serveApp()
  const browser = await launchBrowser()
  const lines = await addSound({ browser, appUrl: app.url, events, marks, video: out, work: `${out}.work`, base: out.replace(/\.mp4$/, '') })
  await browser.close()
  await app.close()
  console.log(lines.join('\n'))
}
