/**
 * Utilidades de color para el acento por cliente (`accentColor`): validación,
 * normalización y derivación de variantes (hover, tenue y texto de contraste).
 */

const HEX_COLOR = /^#[0-9a-f]{6}$/i

export interface AccentTokens {
  /** Acento base normalizado (`#rrggbb` minúsculas). */
  accent: string
  /** Variante para estados hover (más oscura). */
  hover: string
  /** Componentes RGB del acento ("r, g, b") para usar en `rgba(...)`. */
  rgb: string
  /** Variante tenue (rgba) para fondos y gradientes. */
  soft: string
  /** Color de texto legible sobre el acento (`#ffffff` o `#000000`). */
  contrast: string
}

export function isValidHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value)
}

/** Devuelve el hex normalizado (minúsculas) o `null` si no es válido. */
export function normalizeAccentColor(value: unknown): string | null {
  if (!isValidHexColor(value)) return null
  return value.toLowerCase()
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace('#', '')
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  }
}

function channelToHex(channel: number): string {
  return Math.max(0, Math.min(255, Math.round(channel)))
    .toString(16)
    .padStart(2, '0')
}

/** Oscurece un color mezclándolo con negro por `amount` (0..1). */
function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  const factor = 1 - amount
  return `#${channelToHex(r * factor)}${channelToHex(g * factor)}${channelToHex(b * factor)}`
}

/** Luminancia relativa según WCAG. */
function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const linear = (channel: number): number => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/** Elige blanco o negro según cuál tenga mayor contraste con el color dado. */
export function contrastText(hex: string): string {
  const luminance = relativeLuminance(hex)
  const withWhite = 1.05 / (luminance + 0.05)
  const withBlack = (luminance + 0.05) / 0.05
  return withWhite >= withBlack ? '#ffffff' : '#000000'
}

export function deriveAccent(value: string): AccentTokens | null {
  const accent = normalizeAccentColor(value)
  if (!accent) return null

  const { r, g, b } = hexToRgb(accent)
  return {
    accent,
    hover: darken(accent, 0.1),
    rgb: `${r}, ${g}, ${b}`,
    soft: `rgba(${r}, ${g}, ${b}, 0.15)`,
    contrast: contrastText(accent)
  }
}
