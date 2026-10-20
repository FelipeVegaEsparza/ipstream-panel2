'use client'

import { useEffect, useRef, useState } from 'react'
import { PlayIcon, StopIcon } from '@heroicons/react/24/outline'

export function EffectPreviewButton({
  src,
  name,
}: {
  src: string
  name: string
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  const toggle = async () => {
    let audio = audioRef.current
    if (!audio) {
      audio = new Audio(src)
      audio.preload = 'none'
      audio.onended = () => setPlaying(false)
      audio.onpause = () => setPlaying(false)
      audio.onerror = () => setPlaying(false)
      audioRef.current = audio
    }
    if (playing) {
      audio.pause()
      audio.currentTime = 0
      setPlaying(false)
      return
    }
    try {
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-brand hover:text-brand"
      title={playing ? `Detener ${name}` : `Escuchar ${name}`}
      aria-label={playing ? `Detener ${name}` : `Escuchar ${name}`}
    >
      {playing ? <StopIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />}
      {playing ? 'Detener' : 'Escuchar'}
    </button>
  )
}
