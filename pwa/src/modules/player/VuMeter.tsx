import { useEffect, useRef, useState } from 'react'
import { usePlayer } from './PlayerContext'
import { ensureAudioGraph } from './vuEngine'
import styles from './VuMeter.module.css'

interface VuMeterProps {
  bars?: number
  className?: string
}

export function VuMeter({ bars = 120, className }: VuMeterProps) {
  const { audio, isPlaying, corsCapable } = usePlayer()
  const containerRef = useRef<HTMLDivElement>(null)
  const [graph, setGraph] = useState<AnalyserNode | null>(null)

  useEffect(() => {
    if (corsCapable) {
      setGraph(ensureAudioGraph(audio))
    } else {
      setGraph(null)
    }
  }, [corsCapable, audio])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.textContent = ''
    const barEls: HTMLSpanElement[] = []
    for (let index = 0; index < bars; index++) {
      const bar = document.createElement('span')
      container.appendChild(bar)
      barEls.push(bar)
    }

    const data = graph ? new Uint8Array(graph.frequencyBinCount) : null
    const raw = new Array<number>(bars)
    const smooth = new Array<number>(bars)
    let frame = 0

    const renderBars = (levels: number[]) => {
      const mid = (bars - 1) / 2
      let total = 0
      for (let index = 0; index < bars; index++) total += levels[index]
      const avg = total / bars
      for (let index = 0; index < bars; index++) {
        const x = (index - mid) / mid
        const edge = Math.abs(x)
        const leftWeight = x < 0 ? 0.82 : 1
        const level = Math.pow(levels[index], 0.9) * 0.72 * leftWeight
        const edgeEnergy = 0.18 * avg * Math.pow(edge, 1.3)
        const scale = Math.min(0.92, 0.08 + level + edgeEnergy)
        barEls[index].style.transform = `scaleY(${scale.toFixed(3)})`
      }
    }

    const loop = () => {
      if (graph && data && isPlaying) {
        graph.getByteFrequencyData(data)
        const usable = data.length * 0.6
        for (let index = 0; index < bars; index++) {
          const start = Math.floor((index / bars) * usable)
          const end = Math.floor(((index + 1) / bars) * usable)
          let sum = 0
          for (let j = start; j < end; j++) sum += data[j]
          raw[index] = (end > start ? sum / (end - start) : 0) / 255
        }
        for (let index = 0; index < bars; index++) {
          const prev = raw[Math.max(0, index - 1)] ?? 0
          const next = raw[Math.min(bars - 1, index + 1)] ?? 0
          smooth[index] = (prev + raw[index] * 2 + next) / 4
        }
        renderBars(smooth)
      } else {
        const t = performance.now() / 340
        for (let index = 0; index < bars; index++) {
          const envelope =
            index < bars / 2
              ? index / (bars / 2)
              : (bars - index) / (bars / 2)
          const wave =
            Math.abs(Math.sin(t + index * 0.3)) * 0.5 +
            Math.abs(Math.sin(t * 1.7 + index * 0.1)) * 0.5
          smooth[index] = isPlaying
            ? Math.max(0.1, 0.18 + wave * 0.55 * envelope + (1 - envelope) * 0.2)
            : Math.max(0.08, 0.12 * envelope + 0.08)
        }
        renderBars(smooth)
      }
      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frame)
      container.textContent = ''
    }
  }, [graph, bars, isPlaying])

  return (
    <div
      ref={containerRef}
      className={`${styles.vu} ${className ?? ''}`}
      aria-hidden="true"
    />
  )
}
