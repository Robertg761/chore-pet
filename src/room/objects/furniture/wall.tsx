import { PALETTE } from '../../../art/palette'
import { mix } from '../../../art/color'
import type { MessStage } from '../../../domain/types'
import { iso } from '../../iso'
import { dustSpecks } from '../decorParts'
import { cobweb, dustBunny } from '../lamp'
import { softBox } from '../shapes3'
import { MirrorArt } from './MirrorArt'
import { book, cream, front, frontPattern, ink, line, metalBox, plant, timber, type FurnitureLook } from './parts'

export function mirror(look: FurnitureLook, stage: MessStage) {
  return <MirrorArt look={look} stage={stage} />
}


export function wallShelf(look: FurnitureLook, stage: MessStage) {
  const { style, details } = look.options
  const c = look.colors
  const low = 57
  const high = style === 'modern' ? 97 : style === 'classic' ? 110 : 102
  const depth = 0.54
  const messy = stage !== 'clean'

  const backing = (y0: number, y1: number, top: number) => <g>
    {softBox({ x0: 0.02, x1: 0.09, y0, y1, z0: low, z1: top, top: c.woodLight, left: c.woodDark, right: c.fabric, r: style === 'playful' ? 4 : 1 })}
    {frontPattern(look, 0.095, y0 + 0.12, y1 - 0.12, low + 7, top - 6)}
    {messy && (stage === 'messy2'
      ? cobweb(iso(0.1, y0 + 0.13, top - 4), iso(0.1, y0 + 0.52, top - 4), iso(0.1, y0 + 0.13, top - 20), 3)
      : <g fill="none" strokeWidth={1.1} opacity={0.6}>
        {line([0.1, y0 + 0.13, top - 4], [0.1, y0 + 0.13, top - 14], ink, 1.1)}
        {line([0.1, y0 + 0.13, top - 10], [0.1, y0 + 0.29, top - 7], ink, 1.1)}
      </g>)}
  </g>
  const dust = (y0: number, y1: number, z: number, top = false) => {
    if (!messy) return null
    const spots: [number, number, number][] = top
      ? [[0.22, y0 + 0.25, 2.3], [0.39, y1 - 0.22, 2], [0.3, (y0 + y1) / 2, 1.5]]
      : [[0.49, y0 + 0.23, 1.6], [0.49, y1 - 0.2, 1.4]]
    if (stage === 'messy2') spots.push([top ? 0.19 : 0.49, (y0 + y1) / 2 + 0.16, top ? 2 : 1.6])
    return dustSpecks(spots.map(([x, y, r]) => { const p = iso(x, y, z); return [p.x, p.y, r] }))
  }
  const contents = (y: number, z: number, short = false) => details && <g strokeWidth={1.6}>
    {book(look, 0.2, y, z, c.fabric, short ? 12 : 14)}
    {book(look, 0.2, y + 0.16, z, cream, short ? 14 : 17)}
    {book(look, 0.2, y + 0.32, z, mix(c.fabric, PALETTE.warmRed, 0.5), 12)}
  </g>
  const shelf = (y0: number, y1: number, z: number, top = false) => <g>
    {timber(look, 0.02, depth, y0, y1, z - 4, z, style === 'playful' ? 4 : style === 'modern' ? 1 : 2)}
    {dust(y0, y1, z, top)}
  </g>

  if (style === 'playful') {
    // Separate rear boards, side walls and caps leave two actual open cubbies.
    const cubby = (y0: number, y1: number, top: number, withBooks: boolean) => <g>
      {backing(y0, y1, top)}
      {timber(look, 0.02, depth, y0, y0 + 0.12, low, top, 4)}
      {shelf(y0, y1, low + 4)}
      {withBooks && contents(y0 + 0.22, low + 4)}
      {timber(look, 0.02, depth, y1 - 0.12, y1, low, top, 4)}
      {shelf(y0, y1, top, true)}
    </g>
    const bunny = iso(0.3, 1.65, 109)
    return <g>
      {cubby(0.02, 0.98, 102, true)}
      {cubby(1.02, 1.98, 109, false)}
      {details && plant(look, 0.27, 1.42, 109)}
      {stage === 'messy2' && dustBunny(bunny.x, bunny.y, 0.58)}
    </g>
  }

  const closed = style === 'classic' || style === 'cottage'
  const top = high + 2
  const bunny = iso(0.3, 1.75, top)
  return <g>
    {backing(style === 'modern' ? 0.76 : 0.02, 1.98, high)}
    {/* Far supports are behind the books. Near supports are added below. */}
    {closed && timber(look, 0.02, depth, 0.02, 0.13, low, top, 2)}
    {style === 'industrial' && <g>
      {[0.06, 1.84].map((y) => <g key={y}>{metalBox(look, 0.01, 0.11, y, y + 0.1, 48, 111)}{line([0.08, y + 0.05, 49], [0.49, y + 0.05, low], c.metal, 3)}</g>)}
    </g>}
    {style === 'nordic' && <g>
      {line([0.06, 0.22, 113], [0.5, 0.22, low + 1], ink, 4)}
      {line([0.06, 0.22, 113], [0.5, 0.22, low + 1], c.woodDark, 2)}
    </g>}
    {shelf(0.02, 1.98, low + 4)}
    {style === 'classic' ? <g>
      {shelf(0.13, 1.87, 83)}
      {contents(0.33, 83)}
    </g> : contents(style === 'modern' ? 1.04 : 0.25, low + 4, style === 'modern')}
    {style === 'modern' && <g>
      {timber(look, 0.02, depth, 0.76, 0.86, low + 4, high - 2, 1)}
      {timber(look, 0.02, depth, 1.88, 1.98, low + 4, top, 1)}
    </g>}
    {closed && timber(look, 0.02, depth, 1.87, 1.98, low, top, 2)}
    {style === 'nordic' && <g>
      {line([0.06, 1.78, 113], [0.5, 1.78, low + 1], ink, 4)}
      {line([0.06, 1.78, 113], [0.5, 1.78, low + 1], c.woodDark, 2)}
    </g>}
    {shelf(style === 'modern' ? 0.76 : 0.02, 1.98, top, true)}
    {style === 'cottage' && front(depth, 0.06, 1.94, <path d="M0 -57 Q5 -49 10 -57 Q15 -49 20 -57 Q25 -49 30 -57 Q35 -49 40 -57 Q45 -49 50 -57 Q55 -49 60 -57" fill={c.woodLight} strokeWidth={1.5} />)}
    {details && plant(look, 0.25, 1.5, top)}
    {stage === 'messy2' && dustBunny(bunny.x, bunny.y, 0.58)}
  </g>
}
