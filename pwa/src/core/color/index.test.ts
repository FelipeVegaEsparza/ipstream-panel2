import { describe, expect, it } from 'vitest'
import {
  contrastText,
  deriveAccent,
  isValidHexColor,
  normalizeAccentColor
} from './index'

describe('normalizeAccentColor', () => {
  it('normaliza un hex válido a minúsculas', () => {
    expect(normalizeAccentColor('#FF6B00')).toBe('#ff6b00')
    expect(normalizeAccentColor('#ff6b00')).toBe('#ff6b00')
  })

  it('devuelve null ante valores inválidos', () => {
    expect(normalizeAccentColor('ff6b00')).toBeNull()
    expect(normalizeAccentColor('#ff6b0')).toBeNull()
    expect(normalizeAccentColor('#ff6b0z')).toBeNull()
    expect(normalizeAccentColor('')).toBeNull()
    expect(normalizeAccentColor(null)).toBeNull()
    expect(normalizeAccentColor(undefined)).toBeNull()
    expect(normalizeAccentColor(123)).toBeNull()
  })
})

describe('isValidHexColor', () => {
  it('acepta solo #rrggbb', () => {
    expect(isValidHexColor('#000000')).toBe(true)
    expect(isValidHexColor('#FFFFFF')).toBe(true)
    expect(isValidHexColor('#12345')).toBe(false)
    expect(isValidHexColor('red')).toBe(false)
  })
})

describe('contrastText', () => {
  it('usa texto negro sobre fondos claros y blanco sobre oscuros', () => {
    expect(contrastText('#ffffff')).toBe('#000000')
    expect(contrastText('#000000')).toBe('#ffffff')
  })
})

describe('deriveAccent', () => {
  it('deriva hover, soft y contraste de un hex válido', () => {
    const tokens = deriveAccent('#ff6b00')
    expect(tokens).not.toBeNull()
    expect(tokens!.accent).toBe('#ff6b00')
    expect(tokens!.hover).not.toBe('#ff6b00')
    expect(tokens!.rgb).toBe('255, 107, 0')
    expect(tokens!.soft).toBe('rgba(255, 107, 0, 0.15)')
    expect(tokens!.contrast).toMatch(/^#(ffffff|000000)$/)
  })

  it('devuelve null si el color no es válido', () => {
    expect(deriveAccent('no-es-color')).toBeNull()
  })
})
