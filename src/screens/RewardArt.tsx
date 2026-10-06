import { PALETTE } from '../art/palette'
import { catalogEntry } from '../catalog/objects'
import { CharacterArt } from '../character/Character'
import { ITEMS } from '../character/items'
import { poseFor } from '../character/poses'
import type { Pet } from '../domain/types'
import type { Unlock } from '../domain/unlocks'
import { floorStyleOf, wallStyleOf } from '../room/shell/styles'
import { ObjectThumb } from './ObjectThumb'
import { hasRewardArt } from './rewardsModel'

// Small pictures of rewards, shared by the gift box and the rewards screen.
// Everything here is decorative: the name is always written next to it.

const { ink, white } = PALETTE
const SOFT = '#e4dcf7'

/** A soft wrapped gift: for rewards not earned yet, or whose art isn't ready. */
export function GiftSilhouette({ className, tint = SOFT }: { className?: string; tint?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <g stroke={ink} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.55">
        <rect x="8" y="21" width="32" height="20" rx="4" fill={tint} />
        <rect x="6" y="15" width="36" height="9" rx="3.5" fill={tint} />
        <path d="M24 15 V41" fill="none" stroke={ink} />
        <path d="M24 15 C18 6 10 9 15 14 C18 16 22 15 24 15 C26 15 30 16 33 14 C38 9 30 6 24 15 Z" fill="#fff" />
      </g>
    </svg>
  )
}

/** The item on the pet, cropped to the part of the body it goes on. */
function ItemOnPet({ unlock, pet, className }: { unlock: Unlock; pet: Pet; className?: string }) {
  const item = ITEMS.find((i) => i.id === unlock.ref)
  if (!item) return <GiftSilhouette className={className} />
  const anchor = poseFor(pet.species, 'idle').anchors[item.slot]
  const half = 58
  return (
    <svg className={className} viewBox={`${anchor.x - half} ${anchor.y - half + 14} ${half * 2} ${half * 2}`} aria-hidden="true" focusable="false">
      <CharacterArt species={pet.species} mood="happy" bodyColour={pet.bodyColour} equipped={{ [item.slot]: item.id }} />
    </svg>
  )
}

/** A tiny corner of wall or a tile of floor in the style's colours. */
function StyleSwatch({ unlock, className }: { unlock: Unlock; className?: string }) {
  const props = { className, viewBox: '0 0 48 48', 'aria-hidden': true, focusable: false } as const
  const line = { stroke: ink, strokeWidth: 2.5, strokeLinejoin: 'round', strokeLinecap: 'round' } as const
  if (unlock.kind === 'wall') {
    const s = wallStyleOf(unlock.ref)
    return (
      <svg {...props}>
        <polygon points="6,12 24,20 24,42 6,34" fill={s.left} {...line} />
        <polygon points="24,20 42,12 42,34 24,42" fill={s.right} {...line} />
        {s.stripes && (
          <g stroke={white} strokeWidth="2" opacity="0.6" strokeLinecap="round">
            <path d="M12 16 V37 M18 18.5 V39.5" />
            <path d="M30 18.5 V39.5 M36 16 V37" />
          </g>
        )}
      </svg>
    )
  }
  const s = floorStyleOf(unlock.ref)
  return (
    <svg {...props}>
      <polygon points="4,24 24,34 44,24 44,30 24,40 4,30" fill={s.edgeLeft} {...line} />
      <polygon points="24,34 44,24 44,30 24,40" fill={s.edgeRight} {...line} />
      <polygon points="24,8 44,24 24,34 4,24" fill={s.top} {...line} />
      <polygon points="24,8 44,24 24,34 4,24" fill="none" {...line} />
      {s.pattern === 'planks' && (
        <g stroke={ink} strokeWidth="1.5" opacity="0.45" strokeLinecap="round">
          <path d="M14 16 L34 26 M19 12.5 L39 21.5 M9 20 L29 30" />
        </g>
      )}
      {s.pattern === 'checker' && (
        <g fill={s.alt} stroke={ink} strokeWidth="1.5" strokeLinejoin="round">
          <polygon points="24,8 34,16 24,21 14,16" />
          <polygon points="24,21 34,28 24,34 14,28" />
        </g>
      )}
      {s.pattern === 'rug' && (
        <polygon points="24,13 36,23 24,29 12,23" fill={s.alt} stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
      )}
    </svg>
  )
}

/** The reward's picture, or a wrapped gift when it isn't earned or isn't drawn yet. */
export function RewardArt({ unlock, pet, locked = false, className }: { unlock: Unlock; pet: Pet; locked?: boolean; className?: string }) {
  if (locked || !hasRewardArt(unlock)) return <GiftSilhouette className={className} />
  if (unlock.kind === 'item') return <ItemOnPet unlock={unlock} pet={pet} className={className} />
  if (unlock.kind === 'decor') {
    const entry = catalogEntry(unlock.ref)
    return entry ? <ObjectThumb entry={entry} className={className} /> : <GiftSilhouette className={className} />
  }
  return <StyleSwatch unlock={unlock} className={className} />
}

