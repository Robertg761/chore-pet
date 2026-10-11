import { PALETTE } from '../../art/palette'
import { iso } from '../iso'

// Small tableware shared by the counter and the dining table: mugs, bowls,
// crumbs. Same 2-px detail stroke as the sink's mug; they inherit the outline
// colour from the object's group.

const { white, creamDark, steelDark, fabricBlue, dirt } = PALETTE

/** A mug standing at (x, y). `dirty` leaves a coffee ring inside; `tipped` lays it on its side. */
export function mug(x: number, y: number, o: { fill?: string; dirty?: boolean; tipped?: boolean } = {}) {
  const { fill = fabricBlue, dirty = false, tipped = false } = o
  const body = (
    <g strokeWidth={2}>
      <path d={`M${x + 5} ${y - 7} q5 1 4 5 q-1 3 -4 2`} fill="none" />
      <path d={`M${x - 5} ${y - 10} V${y} a5 2.5 0 0 0 10 0 V${y - 10} Z`} fill={fill} />
      <ellipse cx={x} cy={y - 10} rx={5} ry={2.5} fill={tipped ? creamDark : steelDark} />
      {dirty && <ellipse cx={x - 0.5} cy={y - 10} rx={3} ry={1.2} fill={dirt} opacity={0.6} stroke="none" />}
    </g>
  )
  return tipped ? <g transform={`rotate(-82 ${x} ${y - 4})`}>{body}</g> : body
}

/** A bowl with its base at (x, y). `food` fills it with a blob of leftovers. */
export function bowl(x: number, y: number, fill: string = white, food?: string, key?: string | number) {
  return (
    <g key={key} strokeWidth={2}>
      <path d={`M${x - 8.5} ${y - 6} V${y - 4} q0.5 6 8.5 6 q8 0 8.5 -6 V${y - 6} Z`} fill={fill} />
      <ellipse cx={x} cy={y - 6} rx={8.5} ry={4} fill={creamDark} />
      {food && <ellipse cx={x} cy={y - 5.8} rx={6} ry={2.6} fill={food} stroke="none" opacity={0.95} />}
    </g>
  )
}

/** A scatter of crumbs on a surface at height z; points are footprint units [tx, ty]. */
export function crumbs(points: [number, number][], z: number) {
  return (
    <g fill={dirt} stroke="none" opacity={0.7}>
      {points.map(([tx, ty], i) => {
        const p = iso(tx, ty, z)
        return <ellipse key={i} cx={p.x} cy={p.y} rx={1.6} ry={0.9} />
      })}
    </g>
  )
}
