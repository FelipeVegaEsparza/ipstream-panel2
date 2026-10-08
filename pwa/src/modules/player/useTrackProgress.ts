import { useEffect, useRef, useState } from 'react'

export interface TrackProgressData {
  progress: number
  current: number
  duration: number | null
}

/**
 * Progreso del tema actual. Si la API entrega `serverElapsed` (segundos reales
 * del tema), se ancla el reloj local a ese valor y avanza suavemente entre
 * polls. Sin `serverElapsed`, se estima desde que se detecta el cambio de tema.
 */
export function useTrackProgress(
  duration: number | null | undefined,
  trackKey: string | null | undefined,
  isPlaying: boolean,
  serverElapsed?: number | null
): TrackProgressData {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef<number | null>(null)
  const elapsedRef = useRef(0)

  useEffect(() => {
    const base =
      typeof serverElapsed === 'number' && serverElapsed >= 0 ? serverElapsed : 0
    startRef.current = Date.now() - base * 1000
    elapsedRef.current = base
    setElapsed(base)
  }, [trackKey, serverElapsed])

  useEffect(() => {
    if (!isPlaying) return
    // Re-anclar al reanudar: sin esto, `Date.now() - startRef` incluiría todo
    // el tiempo que duró la pausa y la barra saltaría hacia adelante.
    startRef.current = Date.now() - elapsedRef.current * 1000
    const id = setInterval(() => {
      if (startRef.current == null) return
      const next = (Date.now() - startRef.current) / 1000
      elapsedRef.current = next
      setElapsed(next)
    }, 1000)
    return () => clearInterval(id)
  }, [isPlaying])

  const durationSec = duration && duration > 0 ? duration : null
  const current = durationSec ? Math.min(elapsed, durationSec) : elapsed
  const progress = durationSec ? Math.min(elapsed / durationSec, 1) : 0

  return { progress, current, duration: durationSec }
}
