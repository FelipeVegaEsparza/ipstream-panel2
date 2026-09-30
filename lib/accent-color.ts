const ACCENT_COLOR_REGEX = /^#?([0-9a-fA-F]{6})$/

/**
 * Normaliza un color destacado libre al formato `#rrggbb` (minúsculas).
 * Acepta mayúsculas/minúsculas y tolera que falte el `#`.
 * Devuelve `null` para vacíos, formatos inválidos, alpha o longitudes distintas.
 */
export function normalizeAccentColor(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const match = ACCENT_COLOR_REGEX.exec(trimmed)
  if (!match) return null
  return `#${match[1].toLowerCase()}`
}

/**
 * Valida un `accentColor` de un payload de escritura.
 * `null` es válido (equivale a "usar color de la plantilla");
 * cualquier otro valor debe ser un hex válido.
 */
export function parseAccentColorInput(value: unknown): { ok: true; value: string | null } | { ok: false } {
  if (value === null) return { ok: true, value: null }
  const normalized = normalizeAccentColor(value)
  if (!normalized) return { ok: false }
  return { ok: true, value: normalized }
}
