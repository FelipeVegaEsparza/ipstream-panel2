import type { BasicData, FullClientData } from '@/core/types'

export type ServiceMode = 'radio' | 'tv' | 'both'

function hasValue(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Deriva el modo de servicio del cliente desde los datos públicos:
 * `radio` si hay `radioStreamingUrl`, `tv` si solo hay `videoStreamingUrl`, y
 * `both` si hay los dos. Sin URLs asume `radio` (comportamiento histórico).
 */
export function deriveServiceMode(
  basicData: BasicData | null | undefined
): ServiceMode {
  if (!basicData) return 'radio'

  const hasRadio = hasValue(basicData.radioStreamingUrl)
  const hasTv = hasValue(basicData.videoStreamingUrl)

  if (hasRadio && hasTv) return 'both'
  if (hasRadio) return 'radio'
  if (hasTv) return 'tv'
  return 'radio'
}

export function useServiceMode(
  clientData: FullClientData | null | undefined
): ServiceMode {
  return deriveServiceMode(clientData?.basicData)
}

/**
 * Devuelve la URL estable de la TV en vivo del cliente, o `null` si no existe.
 * Es la única fuente de la señal: la app nunca construye rutas `/live`, `/dj`
 * ni `/vod`; el panel entrega `videoStreamingUrl` y su redirect decide la señal
 * al aire.
 */
export function getTvStreamUrl(
  basicData: BasicData | null | undefined
): string | null {
  const url = basicData?.videoStreamingUrl
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  return trimmed.length > 0 ? trimmed : null
}
