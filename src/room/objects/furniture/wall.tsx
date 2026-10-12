import { PALETTE } from '../../../art/palette'
import { mix } from '../../../art/color'
import type { MessStage } from '../../../domain/types'
import { MirrorArt } from './MirrorArt'
import { book, cream, front, frontPattern, ink, line, metalBox, panel, plant, timber, type FurnitureLook } from './parts'

export function mirror(look: FurnitureLook, stage: MessStage) {
  return <MirrorArt look={look} stage={stage} />
}


export function wallShelf(look: FurnitureLook) {
  const { style, details } = look.options
  const c = look.colors
  const low = 57
  // Leave room above the middle shelf for its patterned backing to show.
  const high = style === 'modern' ? 95 : style === 'classic' ? 110 : 102
  return <g>
    {panel(look, 0.06, 0.1, 1.9, low + 1, high, true, style === 'cottage')}
    {frontPattern(look, 0.065, 0.16, 1.84, low + 7, high - 6)}
    {style === 'industrial' && <>
      {[0.07, 1.85].map((y) => <g key={y}>{metalBox(look, 0.02, 0.1, y, y + 0.08, 47, 111)}{line([0.08, y + 0.04, 48], [0.48, y + 0.04, 60], c.metal, 3)}</g>)}
    </>}
    {style === 'nordic' && <>
      {[0.22, 1.72].map((y) => <g key={y}>{line([0.06, y, 113], [0.5, y, 58], ink, 4)}{line([0.06, y, 113], [0.5, y, 58], c.woodDark, 2)}</g>)}
    </>}
    {style === 'playful' ? <>
      {front(0.37, 0.12, 0.91, <g><rect x={0} y={-101} width={25.3} height={39} rx={10} fill={c.woodLight} /><rect x={4} y={-96} width={17.3} height={30} rx={7} fill={c.fabric} strokeWidth={1.5} /></g>)}
      {front(0.37, 1.06, 1.89, <g><rect x={0} y={-108} width={26.6} height={46} rx={12} fill={c.woodLight} /><rect x={4} y={-103} width={18.6} height={37} rx={9} fill={c.fabric} strokeWidth={1.5} /></g>)}
      {frontPattern(look, 0.375, 0.28, 0.78, 70, 87)}
      {frontPattern(look, 0.375, 1.22, 1.72, 70, 94)}
      {timber(look, 0.02, 0.6, 0.02, 1.98, low, low + 4, 6)}
      {timber(look, 0.02, 0.54, 0.02, 1.98, high - 2, high + 2, 6)}
    </> : style === 'modern' ? <>
      {timber(look, 0.02, 0.52, 0.04, 1.3, low, low + 5, 1)}
      {timber(look, 0.02, 0.52, 0.72, 1.96, high - 2, high + 3, 1)}
      {timber(look, 0.02, 0.52, 0.73, 0.83, low + 5, high - 2, 1)}
      {timber(look, 0.02, 0.52, 1.86, 1.96, high - 2, high + 14, 1)}
    </> : <>
      {timber(look, 0.02, 0.52, 0.02, 1.98, low, low + 4, 3)}
      {timber(look, 0.02, 0.48, 0.02, 1.98, high - 2, high + 2, 3)}
      {(style === 'classic' || style === 'cottage') && <>{timber(look, 0.02, 0.48, 0.02, 0.12, low + 2, high + 1, 2)}{timber(look, 0.02, 0.48, 1.88, 1.98, low + 2, high + 1, 2)}</>}
      {style === 'classic' && timber(look, 0.02, 0.48, 0.02, 1.98, 79, 83, 2)}
    </>}
    {style === 'cottage' && front(0.52, 0.06, 1.94, <path d="M0 -57 Q5 -49 10 -57 Q15 -49 20 -57 Q25 -49 30 -57 Q35 -49 40 -57 Q45 -49 50 -57 Q55 -49 60 -57" fill={c.woodLight} strokeWidth={1.5} />)}
    {details && <>
      {book(look, 0.21, 0.34, style === 'classic' ? 83 : 62, c.fabric, 14)}
      {book(look, 0.21, 0.5, style === 'classic' ? 83 : 62, cream, 17)}
      {book(look, 0.21, 0.65, style === 'classic' ? 83 : 62, mix(c.fabric, PALETTE.warmRed, 0.5), 12)}
      {plant(look, 0.25, 1.55, high + 3)}
    </>}
  </g>
}
