// Etiquetas de clima (Open-Meteo WMO) para locuciones y UI.
export function weatherLabel(code: number | null | undefined): string | null {
  if (code === null || code === undefined) return null
  if (code === 0) return 'Despejado'
  if (code === 1) return 'Mayormente despejado'
  if (code === 2) return 'Parcialmente nublado'
  if (code === 3) return 'Nublado'
  if (code === 45 || code === 48) return 'Niebla'
  if (code === 51 || code === 53 || code === 55) return 'Llovizna'
  if (code === 56 || code === 57) return 'Llovizna helada'
  if (code === 61 || code === 63 || code === 65) return 'Lluvia'
  if (code === 66 || code === 67) return 'Lluvia helada'
  if (code === 71 || code === 73 || code === 75) return 'Nieve'
  if (code === 77) return 'Nevada'
  if (code === 80 || code === 81 || code === 82) return 'Chubascos'
  if (code === 85 || code === 86) return 'Chubascos de nieve'
  if (code === 95) return 'Tormenta'
  if (code === 96 || code === 99) return 'Tormenta con granizo'
  return null
}

/** Frase natural para la locución: "cielo despejado", "lluvia", etc. */
export function weatherPhrase(code: number | null | undefined): string {
  if (code === null || code === undefined) return 'condiciones variables'
  if (code === 0) return 'cielo despejado'
  if (code === 1) return 'cielo mayormente despejado'
  if (code === 2) return 'cielo parcialmente nublado'
  if (code === 3) return 'cielo nublado'
  if (code === 45 || code === 48) return 'niebla'
  if (code >= 51 && code <= 57) return 'llovizna'
  if (code >= 61 && code <= 67) return 'lluvia'
  if (code >= 71 && code <= 77) return 'nieve'
  if (code >= 80 && code <= 82) return 'chubascos'
  if (code === 85 || code === 86) return 'chubascos de nieve'
  if (code === 95 || code === 96 || code === 99) return 'tormenta'
  return 'condiciones variables'
}
