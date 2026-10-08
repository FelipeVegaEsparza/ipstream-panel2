import { useRef } from 'react'
import { useHlsVideo } from '@/modules/tv/useHlsVideo'

interface HlsVideoProps {
  src: string
  className?: string
  autoPlay?: boolean
}

/**
 * Reproductor para listas HLS (.m3u8). En Chrome/Android usa hls.js (carga
 * bajo demanda) y en Safari aprovecha el soporte HLS nativo. Un `<video>` plano
 * no reproduce HLS, por eso este componente es necesario.
 */
export function HlsVideo({ src, className, autoPlay = false }: HlsVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  useHlsVideo(videoRef, src)

  return (
    <video
      ref={videoRef}
      className={className}
      controls
      playsInline
      autoPlay={autoPlay}
      data-hls="true"
    />
  )
}
