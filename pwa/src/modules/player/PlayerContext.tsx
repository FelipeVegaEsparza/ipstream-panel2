import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react'

export interface PlayerContextValue {
  audio: HTMLAudioElement
  streamUrl: string | null
  isPlaying: boolean
  corsCapable: boolean
  setStreamUrl: (url: string) => void
  play: () => void
  pause: () => void
  toggle: () => void
}

const audioElement = new Audio()
audioElement.preload = 'none'

/**
 * Comprueba si una URL de stream responde con cabeceras CORS usando un
 * elemento temporal, SIN tocar el elemento de audio compartido (así nunca se
 * interrumpe una reproducción en curso ni se descarga la señal en segundo
 * plano sin que el usuario pulse play).
 */
function probeStreamCors(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = new Audio()
    probe.preload = 'auto'
    probe.crossOrigin = 'anonymous'

    let settled = false
    const cleanup = () => {
      probe.removeEventListener('error', onError)
      probe.removeEventListener('canplay', onCanPlay)
      probe.removeEventListener('loadedmetadata', onLoadedMetadata)
      clearTimeout(timer)
    }
    const finish = (capable: boolean) => {
      if (settled) return
      settled = true
      cleanup()
      try {
        probe.removeAttribute('src')
        probe.load()
      } catch {
        // noop
      }
      resolve(capable)
    }
    const onError = () => finish(false)
    const onCanPlay = () => finish(true)
    const onLoadedMetadata = () => finish(true)

    const timer = setTimeout(() => finish(false), 8_000)

    probe.addEventListener('error', onError, { once: true })
    probe.addEventListener('canplay', onCanPlay, { once: true })
    probe.addEventListener('loadedmetadata', onLoadedMetadata, { once: true })
    probe.src = url
    probe.load()
  })
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

interface PlayerProviderProps {
  children: ReactNode
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  const [streamUrl, setStreamUrlState] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [corsCapable, setCorsCapable] = useState(false)

  const requestedUrlRef = useRef<string | null>(null)
  const loadedUrlRef = useRef<string | null>(null)
  const corsRef = useRef<boolean | null>(null)
  const appliedCorsRef = useRef<boolean | null>(null)
  const isPlayingRef = useRef(false)
  const probeSeqRef = useRef(0)

  useEffect(() => {
    const onPlay = () => {
      isPlayingRef.current = true
      setIsPlaying(true)
    }
    const onPause = () => {
      isPlayingRef.current = false
      setIsPlaying(false)
    }
    audioElement.addEventListener('play', onPlay)
    audioElement.addEventListener('pause', onPause)
    return () => {
      audioElement.removeEventListener('play', onPlay)
      audioElement.removeEventListener('pause', onPause)
    }
  }, [])

  const applySource = useCallback((url: string, cors: boolean) => {
    audioElement.crossOrigin = cors ? 'anonymous' : null
    audioElement.src = url
    loadedUrlRef.current = url
    appliedCorsRef.current = cors
  }, [])

  const ensureLoaded = useCallback(
    (url: string) => {
      if (loadedUrlRef.current === url) return
      const wasPlaying = isPlayingRef.current
      if (audioElement.src && !audioElement.paused) {
        audioElement.pause()
      }
      applySource(url, corsRef.current === true)
      if (wasPlaying) {
        // Quien pidió el cambio ya estaba en reproducción: continuar con la
        // nueva URL en cuanto esté lista (no autoplay forzado si el navegador
        // lo bloquea; play() reintenta desde el gesto del usuario).
        void audioElement.play().catch(() => setIsPlaying(false))
      }
    },
    [applySource]
  )

  const setStreamUrl = useCallback(
    (url: string) => {
      // Mismo destino solicitado: no reprobar ni reiniciar nada.
      if (requestedUrlRef.current === url) return
      requestedUrlRef.current = url
      setStreamUrlState(url)
      setCorsCapable(false)
      corsRef.current = null

      const token = ++probeSeqRef.current
      void probeStreamCors(url).then((capable) => {
        if (token !== probeSeqRef.current) return
        corsRef.current = capable
        setCorsCapable(capable)
        if (!isPlayingRef.current) return
        if (loadedUrlRef.current !== url) {
          // La URL cambió en caliente mientras sonaba: cargar la nueva fuente y
          // continuar (no basta con re-aplicar CORS sobre la fuente anterior).
          applySource(url, capable)
          void audioElement.play().catch(() => setIsPlaying(false))
        } else if (appliedCorsRef.current !== capable) {
          // La misma URL, pero el modo CORS aprendido cambió: re-aplicar para
          // habilitar el medidor VU.
          audioElement.pause()
          applySource(url, capable)
          void audioElement.play().catch(() => setIsPlaying(false))
        }
      })
    },
    [applySource]
  )

  const play = useCallback(() => {
    const url = requestedUrlRef.current
    if (!url) return
    ensureLoaded(url)
    void audioElement.play().catch(() => setIsPlaying(false))
  }, [ensureLoaded])

  const pause = useCallback(() => {
    audioElement.pause()
  }, [])

  const toggle = useCallback(() => {
    if (audioElement.paused) {
      play()
    } else {
      pause()
    }
  }, [play, pause])

  return (
    <PlayerContext
      value={{
        audio: audioElement,
        streamUrl,
        isPlaying,
        corsCapable,
        setStreamUrl,
        play,
        pause,
        toggle
      }}
    >
      {children}
    </PlayerContext>
  )
}

export function usePlayer(): PlayerContextValue {
  const ctx = use(PlayerContext)
  if (!ctx) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return ctx
}
