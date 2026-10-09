import { useEffect, useRef, useState } from 'react'
import { PALETTE } from '../art/palette'
import { catalogEntry } from '../catalog/objects'
import { CharacterArt } from '../character/Character'
import type { Footprint } from '../room/grid'
import { footprintOf, freeTile } from '../room/grid'
import { Room } from '../room/Room'
import { ROOM_VIEWBOX } from '../room/shell/geometry'
import type { Pet, PlacedObject, Room as RoomRow } from '../domain/types'
import { ScreenHeader } from '../shell/ScreenHeader'
import './ShareCard.css'
import { CARD_HEIGHT, CARD_WIDTH, captionFontSize, captionLines, captionText, cardToPng, downloadPng, nameFontSize, shareFileName } from './shareImage'

export interface ShareCardProps {
  pet: Pet
  room: RoomRow
  objects: PlacedObject[]
  /** Chores done so far and the current streak, for the card's caption. */
  choreCount: number
  streak: number
  onClose: () => void
}

const { ink, ground, accent, white } = PALETTE

// Web fonts don't load inside an image, so the card names a system fallback.
const CARD_FONT = "Nunito, 'Trebuchet MS', 'Segoe UI', system-ui, -apple-system, sans-serif"

// Card layout in design px (1080 x 1350). The white panel hugs the room; the name, caption and
// badge sit below it with even gaps, so there is no empty band under the room.
const ROOM_W = 960
const ROOM_H = (ROOM_W * ROOM_VIEWBOX.height) / ROOM_VIEWBOX.width
const ROOM_X = (CARD_WIDTH - ROOM_W) / 2
const PANEL_PAD = 36
const PANEL = { x: 60, y: 60, width: 960, height: PANEL_PAD * 2 + ROOM_H, radius: 56 }
const ROOM_Y = PANEL.y + PANEL_PAD
const NAME_Y = PANEL.y + PANEL.height + 150
const CAPTION_Y = NAME_Y + 72
const CAPTION_GAP = 56
const BADGE = { width: 260, height: 64 }

type Status = 'making' | 'ready' | 'error'

export function ShareCard({ pet, room, objects, choreCount, streak, onClose }: ShareCardProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [status, setStatus] = useState<Status>('making')
  const [png, setPng] = useState<File | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [notice, setNotice] = useState('')

  const caption = captionText(pet.name, choreCount, streak)
  const lines = captionLines(pet.name, choreCount, streak)
  const badgeY = CAPTION_Y + (lines.length - 1) * CAPTION_GAP + 38
  const fileName = shareFileName(pet.name)

  // The pet stands on a free tile at the front; rugs and wall things don't block it.
  const solid: Footprint[] = objects.flatMap((o) => {
    const entry = catalogEntry(o.catalogId)
    return entry && entry.layer === 'solid' ? [footprintOf(o, entry)] : []
  })
  const tile = freeTile(solid) ?? { tx: 3, ty: 3 }

  // The parent hands over fresh arrays every render, so key the picture on what is in it.
  const contentKey = JSON.stringify([pet, room, objects, choreCount, streak])

  // Make the picture as soon as the card is drawn, so Share is ready the moment it is tapped.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    let cancelled = false
    setStatus('making')
    setPng(null)
    cardToPng(svg)
      .then((blob) => {
        if (cancelled) return
        setPng(new File([blob], fileName, { type: 'image/png' }))
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [fileName, attempt, contentKey])

  const canShare = status === 'ready' && png !== null && typeof navigator.canShare === 'function' && navigator.canShare({ files: [png] })

  async function share() {
    if (!png) return
    setNotice('')
    try {
      await navigator.share({ files: [png], title: `${pet.name}'s home` })
    } catch (err) {
      // Closing the share sheet is fine, not an error.
      if (!(err instanceof DOMException && err.name === 'AbortError')) setNotice("Couldn't share it. Try Save image instead?")
    }
  }

  function save() {
    if (!png) return
    setNotice('')
    downloadPng(png, fileName)
    setNotice('Saved. Check your downloads.')
  }

  const statusText =
    status === 'making' ? 'Making your picture…' : status === 'error' ? "Couldn't make the picture. Try again?" : notice || 'Your picture is ready.'

  const nameSize = nameFontSize(pet.name)

  return (
    <section className="share screen-fit" aria-labelledby="share-title">
      <ScreenHeader id="share-title" title="Share your home" onBack={onClose} />

      <div className="share-preview">
        <svg
          ref={svgRef}
          className="share-card"
          viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
          role="img"
          aria-label={`Picture card: ${caption}`}
          fontFamily={CARD_FONT}
        >
          <rect width={CARD_WIDTH} height={CARD_HEIGHT} fill={ground} />
          <rect
            x={PANEL.x}
            y={PANEL.y}
            width={PANEL.width}
            height={PANEL.height}
            rx={PANEL.radius}
            fill={white}
            stroke={ink}
            strokeWidth={8}
          />
          <Room
            room={room}
            objects={objects}
            pet={{
              tile,
              art: (
                <CharacterArt
                  species={pet.species}
                  mood="happy"
                  bodyColour={pet.bodyColour}
                  equipped={pet.equipped}
                  look={{ eyes: pet.eyes, cheeks: pet.cheeks }}
                />
              ),
            }}
            width={ROOM_W}
            svgProps={{ x: ROOM_X, y: ROOM_Y, role: 'presentation', 'aria-label': undefined }}
          />
          <text x={CARD_WIDTH / 2} y={NAME_Y} textAnchor="middle" fontSize={nameSize} fontWeight={900} fill={ink}>
            {pet.name}
          </text>
          {lines.map((line, i) => (
            <text key={i} x={CARD_WIDTH / 2} y={CAPTION_Y + i * CAPTION_GAP} textAnchor="middle" fontSize={captionFontSize(line)} fontWeight={700} fill={ink} fillOpacity={0.78}>
              {line}
            </text>
          ))}
          <rect x={CARD_WIDTH / 2 - BADGE.width / 2} y={badgeY} width={BADGE.width} height={BADGE.height} rx={BADGE.height / 2} fill={accent} stroke={ink} strokeWidth={5} />
          <text x={CARD_WIDTH / 2} y={badgeY + 43} textAnchor="middle" fontSize={36} fontWeight={900} fill={white} letterSpacing={1}>
            Chore Pet
          </text>
        </svg>
      </div>

      <div className="share-side">
        <p className="share-status" role="status" aria-live="polite" data-state={status}>
          {statusText}
        </p>

        <div className="share-actions">
          {canShare && (
            <button type="button" className="btn btn-primary" onClick={share}>
              Share
            </button>
          )}
          <button
            type="button"
            className={canShare ? 'btn' : 'btn btn-primary'}
            onClick={save}
            disabled={status !== 'ready'}
          >
            Save image
          </button>
          {status === 'error' && (
            <button type="button" className="btn" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
