import { describe, expect, it } from 'vitest'
import { CARD_HEIGHT, CARD_WIDTH, captionFontSize, captionLines, captionText, exportSize, nameFontSize, previewSize, shareFileName } from './shareImage'

describe('captionText', () => {
  it('lists chores and the streak', () => {
    expect(captionText('Pip', 23, 4)).toBe('Home of Pip · 23 chores done · 4 days in a row')
  })
  it('skips the streak at 0', () => {
    expect(captionText('Pip', 23, 0)).toBe('Home of Pip · 23 chores done')
  })
  it('uses singular words', () => {
    expect(captionText('Pip', 1, 1)).toBe('Home of Pip · 1 chore done · 1 day in a row')
  })
  it('keeps it short when there is nothing yet', () => {
    expect(captionText('Pip', 0, 0)).toBe('Home of Pip')
  })
  it('falls back when the name is blank', () => {
    expect(captionText('  ', 0, 0)).toBe('Home of your pet')
  })
})

describe('captionLines', () => {
  it('puts the counts on their own line under the name', () => {
    expect(captionLines('Pip', 23, 4)).toEqual(['Home of Pip', '23 chores done · 4 days in a row'])
    expect(captionLines('Pip', 1, 0)).toEqual(['Home of Pip', '1 chore done'])
    expect(captionLines('Pip', 0, 1)).toEqual(['Home of Pip', '1 day in a row'])
  })
  it('is a single line when there is nothing to count', () => {
    expect(captionLines('  ', 0, 0)).toEqual(['Home of your pet'])
  })
  it('keeps a long name readable instead of shrinking the counts', () => {
    const [title, counts] = captionLines('Bartholomew Pumpkin Jr', 23, 4)
    expect(title).toBe('Home of Bartholomew Pumpkin Jr')
    expect(captionFontSize(title)).toBe(44)
    expect(captionFontSize(counts)).toBe(44)
  })
})

describe('shareFileName', () => {
  it('makes a simple file name', () => {
    expect(shareFileName('Pip')).toBe('pip-home.png')
    expect(shareFileName('Mister Bun!')).toBe('mister-bun-home.png')
  })
  it('drops accents and keeps other letters', () => {
    expect(shareFileName('Café')).toBe('cafe-home.png')
    expect(shareFileName('もち')).toBe('もち-home.png')
  })
  it('never makes an empty name', () => {
    expect(shareFileName('')).toBe('pet-home.png')
    expect(shareFileName('***')).toBe('pet-home.png')
  })
})

describe('canvas maths', () => {
  it('exports 1080 x 1350 by default, 4:5', () => {
    expect(exportSize()).toEqual({ width: 1080, height: 1350 })
    expect(CARD_WIDTH / CARD_HEIGHT).toBeCloseTo(0.8)
  })
  it('scales and clamps the export', () => {
    expect(exportSize(0.5)).toEqual({ width: 540, height: 675 })
    expect(exportSize(10)).toEqual({ width: 2160, height: 2700 })
    expect(exportSize(0)).toEqual({ width: 270, height: 338 })
    expect(exportSize(Number.NaN)).toEqual({ width: 1080, height: 1350 })
  })
  it('fits the preview to the space, 4:5', () => {
    expect(previewSize(350)).toEqual({ width: 350, height: 438 })
    expect(previewSize(5000)).toEqual({ width: 1080, height: 1350 })
    expect(previewSize(-3)).toEqual({ width: 0, height: 0 })
  })
})

describe('text sizes', () => {
  it('shrinks long names, never below the minimum', () => {
    expect(nameFontSize('Pip')).toBe(132)
    expect(nameFontSize('Mister Biscuit')).toBeLessThan(132)
    expect(nameFontSize('A'.repeat(60))).toBe(64)
  })
  it('shrinks long captions, never below the minimum', () => {
    expect(captionFontSize('Home of Pip')).toBe(44)
    expect(captionFontSize('x'.repeat(100))).toBe(32)
  })
})
