// Helpers for the shareable "my home" card: caption text, file name, canvas
// maths (all pure, tested) and the SVG -> PNG export (browser only).

/** The card is designed at 1080 x 1350 (4:5), the size social apps like. */
export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350

/** Where the shown text may run out of room; smaller type keeps it on the card. */
const NAME_SIZE = 132
const NAME_FULL_CHARS = 9
const NAME_MIN_SIZE = 64
const CAPTION_SIZE = 38
const CAPTION_FULL_CHARS = 46
const CAPTION_MIN_SIZE = 26

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** "Home of Pip · 23 chores done · 4 days in a row"; parts with nothing to say are left out. */
export function captionText(name: string, choreCount: number, streak: number): string {
  const parts = [`Home of ${name.trim() || 'your pet'}`]
  if (choreCount > 0) parts.push(`${plural(choreCount, 'chore', 'chores')} done`)
  if (streak > 0) parts.push(`${plural(streak, 'day', 'days')} in a row`)
  return parts.join(' · ')
}

/** "pip-home.png"; letters and digits only, with a safe fallback for odd names. */
export function shareFileName(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'pet'}-home.png`
}

/** Pixel size of the exported PNG at `scale` (1 = the 1080 x 1350 design), kept to a sane range. */
export function exportSize(scale = 1): { width: number; height: number } {
  const s = Number.isFinite(scale) ? Math.min(Math.max(scale, 0.25), 2) : 1
  return { width: Math.round(CARD_WIDTH * s), height: Math.round(CARD_HEIGHT * s) }
}

/** Size of the on-screen preview in an available width: 4:5, never bigger than the design. */
export function previewSize(availableWidth: number): { width: number; height: number } {
  const width = Math.min(Math.max(Math.floor(availableWidth), 0), CARD_WIDTH)
  return { width, height: Math.round((width * CARD_HEIGHT) / CARD_WIDTH) }
}

/** Font size for the big pet name: shrinks for long names so it stays on the card. */
export function nameFontSize(name: string): number {
  const len = Math.max([...name.trim()].length, 1)
  return len <= NAME_FULL_CHARS ? NAME_SIZE : Math.max(NAME_MIN_SIZE, Math.floor((NAME_SIZE * NAME_FULL_CHARS) / len))
}

/** Font size for the caption line, shrunk when the line is long. */
export function captionFontSize(caption: string): number {
  const len = [...caption].length
  return len <= CAPTION_FULL_CHARS ? CAPTION_SIZE : Math.max(CAPTION_MIN_SIZE, Math.floor((CAPTION_SIZE * CAPTION_FULL_CHARS) / len))
}

// ---- export (browser only) --------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg'

/** The card's SVG as a standalone string: fixed pixel size, namespace set, nothing external. */
export function serializeCard(svg: SVGSVGElement, scale = 1): string {
  const { width, height } = exportSize(scale)
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', SVG_NS)
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.removeAttribute('class')
  clone.removeAttribute('style')
  return new XMLSerializer().serializeToString(clone)
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('The card image could not load'))
    img.src = url
  })
}

/** Draw the card SVG onto a canvas and return it as a PNG. Rejects if anything goes wrong. */
export async function cardToPng(svg: SVGSVGElement, scale = 1): Promise<Blob> {
  const { width, height } = exportSize(scale)
  const url = URL.createObjectURL(new Blob([serializeCard(svg, scale)], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No canvas')
    ctx.drawImage(img, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The PNG came back empty'))), 'image/png')
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Hand a PNG to the browser as a download. The object URL is released shortly after. */
export function downloadPng(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
