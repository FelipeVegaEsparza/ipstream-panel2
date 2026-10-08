import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

export type HlsVideoStatus = 'loading' | 'playing' | 'error'

export interface HlsVideoHandle {
  status: HlsVideoStatus
  /** `true` cuando el autoplay con sonido fue bloqueado y se reprodujo en silencio. */
  muted: boolean
  /** `true` cuando el navegador bloqueó incluso el autoplay silenciado. */
  needsInteraction: boolean
  /** Quita el silencio y reproduce; debe llamarse desde un gesto del usuario. */
  enableSound: () => void
  reload: () => void
}

const MAX_NETWORK_RETRIES = 3
const MAX_MEDIA_RETRIES = 3
const MAX_NATIVE_RETRIES = 3

/**
 * Ajustes de hls.js para señales en vivo. Por defecto hls.js no reajusta su
 * posición a la ventana en vivo (`maxLiveSyncPlaybackRate: 1` y
 * `liveMaxLatencyDurationCount: Infinity`): con playlists deslizantes cortas, si
 * el buffer se atrasa (red lenta o app en segundo plano) el borde en vivo avanza
 * y la imagen queda congelada. Mantenemos la reproducción cerca del borde y
 * permitimos acelerar para recuperar el atraso.
 */
const HLS_LIVE_CONFIG = {
  lowLatencyMode: false,
  liveSyncDurationCount: 2,
  liveMaxLatencyDurationCount: 6,
  maxLiveSyncPlaybackRate: 1.5,
  backBufferLength: 30
}

export function useHlsVideo(
  videoRef: RefObject<HTMLVideoElement | null>,
  src: string | null
): HlsVideoHandle {
  const [status, setStatus] = useState<HlsVideoStatus>('loading')
  const [muted, setMuted] = useState(false)
  const [needsInteraction, setNeedsInteraction] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)
  const networkRetries = useRef(0)
  const mediaRetries = useRef(0)
  const nativeRetries = useRef(0)

  const reload = useCallback(() => {
    networkRetries.current = 0
    mediaRetries.current = 0
    nativeRetries.current = 0
    setReloadTick((tick) => tick + 1)
  }, [])

  const enableSound = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = false
    setMuted(false)
    try {
      void video.play().catch(() => {
        // Si el gesto no alcanza, se mantiene silenciado.
        video.muted = true
        setMuted(true)
      })
    } catch {
      // play() no implementado: se mantiene el estado actual.
    }
  }, [videoRef])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) {
      setStatus('loading')
      return
    }

    networkRetries.current = 0
    mediaRetries.current = 0
    nativeRetries.current = 0
    setStatus('loading')
    setMuted(false)
    setNeedsInteraction(false)

    let disposed = false

    // Intenta autoplay con sonido; si el navegador lo bloquea, cae a silenciado.
    const attemptPlay = () => {
      if (disposed) return
      let result: Promise<void> | undefined
      try {
        result = video.play()
      } catch {
        return
      }
      if (!result || typeof result.then !== 'function') return

      result
        .then(() => {
          if (disposed) return
          setMuted(video.muted)
          setNeedsInteraction(false)
        })
        .catch((error: unknown) => {
          if (disposed) return
          if ((error as { name?: string } | null)?.name !== 'NotAllowedError') {
            return
          }
          // Autoplay con sonido bloqueado: reintentar silenciado.
          video.muted = true
          setMuted(true)
          let mutedResult: Promise<void> | undefined
          try {
            mutedResult = video.play()
          } catch {
            setNeedsInteraction(true)
            return
          }
          if (!mutedResult || typeof mutedResult.then !== 'function') return
          mutedResult
            .then(() => {
              if (!disposed) setNeedsInteraction(false)
            })
            .catch(() => {
              if (!disposed) setNeedsInteraction(true)
            })
        })
    }

    const handlePlaying = () => setStatus('playing')
    video.addEventListener('playing', handlePlaying)

    let hls: InstanceType<typeof import('hls.js')['default']> | null = null
    let detachNative = () => {}

    // hls.js se carga bajo demanda (chunk aparte) para no engordar el bundle
    // inicial de las radios que no usan señal de TV. Se usa cuando el navegador
    // no reproduce HLS de forma nativa.
    const setupHls = () => {
      void import('hls.js')
        .then(({ default: HlsModule }) => {
          if (disposed) return
          if (!HlsModule.isSupported()) {
            setStatus('error')
            return
          }

          const instance = new HlsModule(HLS_LIVE_CONFIG)
          hls = instance
          instance.attachMedia(video)
          instance.loadSource(src)

          instance.on(HlsModule.Events.MANIFEST_PARSED, () => {
            if (!disposed) attemptPlay()
          })

          instance.on(HlsModule.Events.ERROR, (_event, data) => {
            if (disposed) return

            // Los errores no fatales (buffer, fragmentos recuperables) no deben
            // consumir reintentos ni marcar la señal como caída.
            if (!data.fatal) return

            if (data.type === HlsModule.ErrorTypes.NETWORK_ERROR) {
              if (networkRetries.current < MAX_NETWORK_RETRIES) {
                networkRetries.current += 1
                instance.startLoad()
              } else {
                setStatus('error')
              }
              return
            }

            if (data.type === HlsModule.ErrorTypes.MEDIA_ERROR) {
              if (mediaRetries.current < MAX_MEDIA_RETRIES) {
                mediaRetries.current += 1
                instance.recoverMediaError()
              } else {
                setStatus('error')
              }
              return
            }

            // Cualquier otro error fatal (mux/keySystem/other): sin recuperación.
            setStatus('error')
          })
        })
        .catch(() => {
          if (!disposed) setStatus('error')
        })
    }

    // El HLS nativo (`<video src>`) reproduce la señal directamente: sigue el
    // redirect del panel sin las restricciones CORS de XHR, que rechazan el 302
    // de `/tv/...` para los dominios de los clientes. Es la vía preferida cuando
    // el navegador lo soporta (Chrome/Safari); hls.js queda como respaldo.
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      const handleLoaded = () => attemptPlay()
      const handleNativeError = () => {
        if (disposed) return
        // El HLS nativo no se recupera solo: un error aislado no debe tumbar la
        // señal, así que reintentamos reasignando la fuente.
        if (nativeRetries.current < MAX_NATIVE_RETRIES) {
          nativeRetries.current += 1
          video.src = src
          video.load()
          return
        }
        // Sin más margen nativo: último intento con hls.js antes de rendirse.
        video.removeEventListener('error', handleNativeError)
        setupHls()
      }

      video.addEventListener('loadedmetadata', handleLoaded)
      video.addEventListener('error', handleNativeError)
      detachNative = () => {
        video.removeEventListener('loadedmetadata', handleLoaded)
        video.removeEventListener('error', handleNativeError)
      }

      video.src = src
      // Reasignar el mismo src no reinicia el elemento nativo: load() fuerza
      // la recarga cuando reintentamos tras un error.
      video.load()
    } else {
      setupHls()
    }

    return () => {
      disposed = true
      hls?.destroy()
      detachNative()
      video.removeEventListener('playing', handlePlaying)
    }
  }, [src, videoRef, reloadTick])

  return { status, muted, needsInteraction, enableSound, reload }
}
