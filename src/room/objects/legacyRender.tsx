import { cloneElement, Fragment, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import { mix } from '../../art/color'
import { PALETTE, ROOM_STROKE } from '../../art/palette'
import { appearanceColors, normalizeAppearance, type FurnitureAppearance } from '../../catalog/customization'
import type { MessStage } from '../../domain/types'
import { legacyAccent, legacyDetails, styledCabinet } from './legacyDetails'
import { styledBedFrame, styledBeanBag, styledBeanBagSurfaceMess, styledBookshelf, styledBookshelfMess, styledCouch, styledLamp, styledRug, styledTable, type LegacyStyle } from './legacyFurniture'
import type { ObjectArt } from './types'

interface SvgProps {
  children?: ReactNode
  fill?: string
  stroke?: string
  id?: string
  clipPath?: string
  transform?: string
  cx?: number
  cy?: number
  r?: number
  rx?: number
  ry?: number
  opacity?: number
  fillOpacity?: number
  strokeWidth?: number
  [key: string]: unknown
}
const { ink, white, floorWood, woodDark, fabricBlue, warmRed, cream, creamDark, steel, steelDark } = PALETTE
const childList = (node: ReactElement<SvgProps>): ReactNode[] => Array.isArray(node.props.children) ? node.props.children : [node.props.children]
const keyed = (nodes: ReactNode[]) => nodes.map((node, i) => <Fragment key={i}>{node}</Fragment>)

function materialMap(id: string, s: LegacyStyle) {
  const { c, fabricFill } = s
  const colors = new Map<string, string>([
    [floorWood, c.wood], [woodDark, c.woodDark], [PALETTE.floorWoodSide, c.woodDark],
    [mix(woodDark, ink, 0.2), c.woodDark], [mix(woodDark, ink, 0.28), mix(c.woodDark, ink, 0.28)],
    [mix(woodDark, ink, 0.5), mix(c.woodDark, ink, 0.5)],
    [fabricBlue, fabricFill], [mix(fabricBlue, ink, 0.22), c.fabricDark], [mix(fabricBlue, white, 0.28), c.fabricLight],
  ])
  for (const blend of [0.22, 0.28, 0.3, 0.32]) colors.set(mix(floorWood, white, blend), c.woodLight)
  if (['fridge', 'washer', 'dishwasher', 'stove', 'toilet', 'shower'].includes(id)) {
    colors.set(cream, c.wood).set(creamDark, c.woodDark).set(white, c.woodLight).set(steel, c.wood).set(steelDark, c.woodDark)
  }
  if (id === 'rug') colors.set(warmRed, fabricFill).set(PALETTE.blush, c.fabricLight).set(mix(warmRed, PALETTE.dirt, 0.25), c.fabricDark).set(cream, c.woodLight)
  if (id === 'lamp') colors.set(cream, fabricFill).set(creamDark, c.fabricDark)
  if (id === 'wall-clock') colors.set(warmRed, fabricFill).set(mix(warmRed, ink, 0.22), c.fabricDark).set(mix(warmRed, white, 0.28), c.fabricLight)
  if (id === 'teddy') colors.set(warmRed, fabricFill).set(mix(warmRed, ink, 0.22), c.fabricDark)
  if (id === 'plant') {
    const pot = mix(warmRed, floorWood, 0.4)
    colors.set(pot, c.wood).set(mix(pot, white, 0.22), c.woodLight)
  }
  if (id === 'trash') colors.set(PALETTE.leaf, c.wood).set(PALETTE.leafDark, c.woodDark).set(steel, c.woodLight)
  if (id === 'recycling') colors.set(steel, c.wood).set(steelDark, c.woodDark)
  if (id === 'poster') colors.set(PALETTE.sky, fabricFill)
  return colors
}

function bulbShape(props: SvgProps, s: LegacyStyle): ReactNode {
  const { a, c } = s
  const x = Number(props.cx)
  const y = Number(props.cy)
  const off = props.fill === mix(steel, creamDark, 0.5)
  const fill = off ? props.fill : s.fabricFill
  if (a.style === 'cottage') return <g><rect x={x - 4} y={y - 5} width={8} height={10} rx={2} fill={fill} strokeWidth={1.4} />{a.details && <path d={`M${x - 2} ${y - 3} V${y + 3} M${x + 2} ${y - 3} V${y + 3}`} fill="none" strokeWidth={0.8} />}</g>
  if (a.style === 'modern') return <rect x={x - 2.7} y={y - 5.2} width={5.4} height={11} rx={2.7} fill={fill} strokeWidth={1.4} />
  if (a.style === 'nordic') return <path d={`M${x} ${y - 5} L${x + 4.5} ${y} L${x} ${y + 5} L${x - 4.5} ${y} Z`} fill={fill} strokeWidth={1.4} />
  if (a.style === 'industrial') return <g><ellipse cx={x} cy={y} rx={4} ry={5.5} fill={fill} strokeWidth={1.4} />{a.details && <path d={`M${x - 4} ${y} H${x + 4} M${x} ${y - 5} V${y + 5}`} fill="none" stroke={c.metal} strokeWidth={1.2} />}</g>
  if (a.style === 'playful') return <path d={`M${x} ${y - 6} l1.8 3.8 4.2 .6 -3 3 .7 4.1 -3.7 -1.9 -3.7 1.9 .7 -4.1 -3 -3 4.2 -.6 Z`} fill={fill} strokeWidth={1.4} />
  return <ellipse {...props} fill={fill} />
}

/** Repaint materials, retaining shared ink, dirt, dust, water and leaf tokens. */
function recolor(node: ReactNode, id: string, s: LegacyStyle, colors: Map<string, string>, prefix: string): ReactNode {
  if (Array.isArray(node)) return node.map((child, i) => <Fragment key={i}>{recolor(child, id, s, colors, prefix)}</Fragment>)
  if (!isValidElement<SvgProps>(node)) return node
  const p = node.props
  const props: SvgProps = {}
  if (p.fill && colors.has(p.fill)) props.fill = colors.get(p.fill)
  if (p.stroke && p.stroke !== ink && colors.has(p.stroke)) {
    const color = colors.get(p.stroke)!
    props.stroke = color.startsWith('url(') ? s.c.fabric : color
  }
  if (p.id) props.id = `${prefix}-${p.id}`
  if (p.clipPath) props.clipPath = p.clipPath.replace(/url\(#([^)]*)\)/g, `url(#${prefix}-$1)`)
  if (!s.a.details && id === 'teddy' && node.type === 'g' && Array.isArray(p.children) && p.children.some((child: ReactNode) => isValidElement<SvgProps>(child) && child.props.cy === -17.4 && child.type === 'ellipse')) return null
  if (!s.a.details && id === 'fairy-lights' && node.type === 'g' && Array.isArray(p.children) && p.children.some((child: ReactNode) => isValidElement<SvgProps>(child) && child.props.r === 11.5)) return null
  if (!s.a.details && id === 'wall-clock' && node.type === 'circle' && p.r === 1.15) return null
  if (!s.a.details && id === 'poster' && node.type === 'circle' && Number(p.r) <= 1.1) return null
  if (id === 'wall-clock' && node.type === 'circle' && p.r === 13.4 && p.fill === warmRed) return <g><circle cx={p.cx} cy={p.cy} r={15.5} fill={s.c.wood} strokeWidth={1.5} /><circle {...p} fill={s.fabricFill} /></g>
  if (id === 'fairy-lights' && node.type === 'ellipse' && p.rx === 4 && p.ry === 4.6) return bulbShape(p, s)
  if (id === 'teddy' && node.type === 'ellipse' && p.cx === 0 && p.cy === -9.4) {
    const { style, details } = s.a
    return <g>
      {style === 'playful' ? <path d="M0 -17 L3 -12 L8 -11 L4 -7 L5 -2 L0 -4 L-5 -2 L-4 -7 L-8 -11 L-3 -12 Z" fill={s.fabricFill} strokeWidth={1.5} /> : style === 'industrial' ? <rect x={-6} y={-16} width={12} height={14} rx={2} fill={s.fabricFill} strokeWidth={1.5} /> : <ellipse {...p} rx={style === 'modern' ? 9 : style === 'nordic' ? 6.5 : 7.6} ry={style === 'modern' ? 5 : 7} fill={s.fabricFill} />}
      {details && style === 'cottage' && <ellipse cx={0} cy={-9.4} rx={5.5} ry={5} fill="none" stroke={cream} strokeWidth={1.1} strokeDasharray="1.5 2" />}
      {details && style === 'nordic' && <path d="M-4 -9 l2 -2 2 2 2 -2 2 2 M-4 -5 l2 -2 2 2 2 -2 2 2" fill="none" stroke={cream} strokeWidth={1} />}
    </g>
  }
  if (!s.a.details && ['bed', 'couch', 'rug', 'lamp', 'bookshelf'].includes(id) && node.type === 'circle' && Number(p.r) <= 2.5) return null
  return cloneElement(node, props, p.children === undefined ? undefined : recolor(p.children, id, s, colors, prefix))
}

/** Wall construction shares the original tilt, with dust and peeling corners above it. */
function attachWallDetails(node: ReactNode, details: ReactNode, bodyCount: number): ReactNode {
  if (Array.isArray(node)) return node.map((child, i) => <Fragment key={i}>{attachWallDetails(child, details, bodyCount)}</Fragment>)
  if (!isValidElement<SvgProps>(node)) return node
  const parts = childList(node)
  if (node.props.transform?.startsWith('rotate(')) {
    return cloneElement(node, {}, keyed([...parts.slice(0, bodyCount), details, ...parts.slice(bodyCount)]))
  }
  return cloneElement(node, {}, node.props.children === undefined ? undefined : attachWallDetails(node.props.children, details, bodyCount))
}

function recolorArt(art: ObjectArt, stage: MessStage, s: LegacyStyle, prefix: string) {
  const original = art.render(stage)
  if (!isValidElement<SvgProps>(original)) return original
  const id = art.catalogId
  const colors = materialMap(id, s)
  const paint = (node: ReactNode) => recolor(node, id, s, colors, prefix)
  const paintParts = (node: ReactNode, indices: number[]) => isValidElement<SvgProps>(node)
    ? cloneElement(node, {}, keyed(childList(node).map((part, i) => indices.includes(i) ? paint(part) : part)))
    : node
  const nodes = childList(original)
  const classic = s.a.style === 'classic'
  let children: ReactNode[]

  if (id === 'bed') {
    children = nodes.map((node, i) => i === 0 && !classic ? styledBedFrame(s) : i === 6 && !classic ? styledBedFrame(s, true) : i < 7 ? paint(node) : node)
  } else if (id === 'couch' || id === 'table' || id === 'rug' || id === 'dining-table') {
    const body = classic ? paint(nodes[0]) : id === 'couch' ? styledCouch(s, stage) : id === 'rug' ? styledRug(s) : styledTable(s, id === 'dining-table')
    children = [body, legacyAccent(id, s), ...nodes.slice(1).map((node, i) => {
      if (id === 'dining-table' && i === 0) return s.a.details ? node : null
      // The fallen cushions still belong to the couch; food and laundry keep their own colors.
      return id === 'couch' && stage === 'messy2' && i === 1 ? paintParts(node, [0, 1]) : node
    })]
  } else if (id === 'bookshelf') {
    children = classic ? [...nodes.slice(0, 3).map(paint), s.a.details ? nodes[3] : null, ...nodes.slice(4)] : [styledBookshelf(s), s.a.details ? nodes[3] : null, styledBookshelfMess(s, stage)]
  } else if (id === 'lamp') {
    children = classic ? [...nodes.slice(0, 3).map(paint), ...nodes.slice(3)] : [styledLamp(s), ...nodes.slice(3)]
  } else if (id === 'bean-bag' && isValidElement<SvgProps>(nodes[0])) {
    const inner = nodes[0]
    const parts = childList(inner)
    const body = isValidElement<SvgProps>(parts[1]) ? cloneElement(parts[1], {}, classic ? paint(parts[1].props.children) : styledBeanBag(s)) : parts[1]
    const fittedMess = !classic && s.a.style !== 'playful'
    const mess = !fittedMess || stage === 'clean' ? parts.slice(2) : stage === 'messy1' ? [styledBeanBagSurfaceMess(stage, s)] : [
      styledBeanBagSurfaceMess(stage, s),
      isValidElement<SvgProps>(parts[3]) ? cloneElement(parts[3], {}, keyed(childList(parts[3]).slice(2))) : parts[3],
    ]
    children = [cloneElement(inner, {}, keyed([parts[0], body, ...mess]))]
  } else if (id === 'sink' || id === 'counter') {
    const count = id === 'sink' ? 3 : 2
    children = [classic ? paint(nodes[0]) : styledCabinet(s, id === 'counter' ? 2 : 1), ...nodes.slice(1, count).map((node, i) => id === 'counter' && i === 0 && !s.a.details ? null : paint(node)), ...nodes.slice(count)]
  } else if (id === 'fish-tank') {
    // Each stage includes its own stand, then the tank and its condition.
    children = nodes.map((node, i) => {
      if (i > 2 || !isValidElement<SvgProps>(node)) return node
      const parts = childList(node)
      return cloneElement(node, {}, keyed([paint(parts[0]), ...parts.slice(1)]))
    })
    children.push(legacyDetails(id, s, stage), legacyAccent(id, s))
  } else if (id === 'poster' || id === 'wall-clock') {
    const frame = legacyDetails(id, s, stage)
    children = nodes.map((node) => {
      const drawing = paint(node)
      // legacyDetails is wrapped in the wall-plane transform already present in the original.
      return isValidElement<SvgProps>(frame) ? attachWallDetails(drawing, frame.props.children, id === 'poster' ? 2 : 1) : drawing
    })
  } else if (id === 'teddy' || id === 'fairy-lights') {
    children = nodes.map(paint)
    children.push(legacyDetails(id, s, stage), legacyAccent(id, s))
  } else if (id === 'shower') {
    // The selected finish belongs to the enclosure. Chrome fixtures, steam and glass shine retain their materials.
    children = nodes.map((node, i) => i === 0 ? paintParts(node, [0, 1]) : i === 1 ? paint(node) : i === 5 ? paintParts(node, [4, 5, 6, 7, 8]) : node)
    children.splice(3, 0, legacyDetails(id, s, stage), legacyAccent(id, s))
  } else if (id === 'toilet') {
    // Tank decorations sit behind the bowl and raised seat rather than being pasted over them.
    children = [nodes[0], paintParts(nodes[1], [0, 1, 2]), legacyDetails(id, s, stage), legacyAccent(id, s), paintParts(nodes[2], [0, 1, 2]), paint(nodes[3]), ...nodes.slice(4)]
  } else if (id === 'stove' || id === 'washer') {
    // Repaint the cabinet while keeping cookware, burners, controls and window highlights separate.
    children = [id === 'stove' ? paintParts(nodes[0], [0]) : paint(nodes[0]), nodes[1], nodes[2], legacyDetails(id, s, stage), legacyAccent(id, s), ...nodes.slice(3)]
  } else if (id === 'recycling' && stage === 'messy2' && isValidElement<SvgProps>(nodes[2])) {
    const mess = nodes[2]
    const parts = childList(mess)
    // Five floor objects precede the bin; decoration belongs above its body and below the pile.
    children = [nodes[0], nodes[1], cloneElement(mess, {}, keyed([...parts.slice(0, 5), paint(parts[5]), legacyDetails(id, s, stage), legacyAccent(id, s), ...parts.slice(6)]))]
  } else {
    const count = Math.max(0, nodes.length - 2)
    children = [...nodes.slice(0, count).map(paint), legacyDetails(id, s, stage), legacyAccent(id, s), ...nodes.slice(count).map((node, i) => id === 'fridge' && stage === 'messy2' && i === 1 ? paintParts(node, [0]) : node)]
  }
  if (['bed', 'bookshelf', 'lamp'].includes(id)) children.splice(Math.max(0, children.length - 2), 0, legacyAccent(id, s))
  if (id === 'bean-bag') children.push(legacyAccent(id, s))
  if (id === 'sink' || id === 'counter') children.splice(Math.max(0, children.length - 2), 0, legacyAccent(id, s))
  return cloneElement(original, {}, keyed(children))
}

export function LegacyStyledArt({ art, stage, appearance }: { art: ObjectArt; stage: MessStage; appearance: FurnitureAppearance }) {
  const unique = useId().replace(/:/g, '')
  const a = normalizeAppearance(appearance)
  const c = appearanceColors(a)
  const id = `furniture-fabric-${unique}`
  const s: LegacyStyle = { a, c, fabricFill: a.pattern === 'plain' ? c.fabric : `url(#${id})` }
  return <g data-furniture-style={a.style} stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
    {a.pattern !== 'plain' && <defs><pattern id={id} width={a.pattern === 'dots' ? 10 : 12} height={a.pattern === 'dots' ? 10 : 12} patternUnits="userSpaceOnUse">
      <rect width={12} height={12} fill={c.fabric} stroke="none" />
      {a.pattern === 'stripes' && <rect width={4} height={12} fill={c.fabricLight} stroke="none" />}
      {a.pattern === 'checks' && <g fill={c.fabricLight} stroke="none"><rect width={6} height={6} /><rect x={6} y={6} width={6} height={6} /></g>}
      {a.pattern === 'dots' && <circle cx={5} cy={5} r={1.7} fill={c.fabricLight} stroke="none" />}
    </pattern></defs>}
    {recolorArt(art, stage, s, unique)}
  </g>
}
