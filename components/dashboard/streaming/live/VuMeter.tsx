'use client'

import { clamp, formatDb } from '@/lib/live-console/audio-math'

interface Props {
  db: number
  label?: string
  compact?: boolean
}

export function VuMeter({ db, label, compact = false }: Props) {
  const pct = Number.isFinite(db) ? clamp(((db + 60) / 60) * 100, 0, 100) : 0
  const color = pct > 92 ? 'bg-red-500' : pct > 75 ? 'bg-yellow-500' : 'bg-brand'

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        {label && <span>{label}</span>}
        <span className="font-mono">{formatDb(db)}</span>
      </div>
      <div className={`w-full overflow-hidden rounded-full bg-secondary ${compact ? 'h-1.5' : 'h-2'}`}>
        <div className={`h-full rounded-full transition-[width] duration-100 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
