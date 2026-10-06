import { CHARACTER_STROKE, PALETTE } from '../art/palette'
import type { Item } from './slots'

// Wearable items. Each is drawn centred on (0,0) and must look right on every
// pose of every species (check the art gallery at /?art).

export const ITEMS: Item[] = [
  {
    id: 'beanie-red',
    slot: 'head',
    name: 'Red beanie',
    render: () => (
      <g stroke={PALETTE.ink} strokeWidth={CHARACTER_STROKE} strokeLinejoin="round">
        <path d="M-38 18 C-38 -26 38 -26 38 18 Z" fill={PALETTE.warmRed} />
        <rect x={-42} y={10} width={84} height={14} rx={7} fill="#F4A08A" />
        <circle cx={0} cy={-28} r={9} fill={PALETTE.white} />
      </g>
    ),
  },
]
