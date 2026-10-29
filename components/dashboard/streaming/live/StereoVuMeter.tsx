'use client'

import { clamp } from '@/lib/live-console/audio-math'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Props {
  leftDb: number
  rightDb: number
}

const SEGMENTS = 24
const MIN_DB = -60
const MAX_DB = 0

function segmentDb(index: number): number {
  return MIN_DB + (index / (SEGMENTS - 1)) * (MAX_DB - MIN_DB)
}

const YELLOW_DB = -18
const RED_DB = -6

function levelColor(db: number): string {
  if (db >= RED_DB) return 'bg-red-500'
  if (db >= YELLOW_DB) return 'bg-yellow-500'
  return 'bg-emerald-500'
}

function formatLevel(db: number): string {
  if (!Number.isFinite(db)) return '-∞'
  return `${Math.round(clamp(db, MIN_DB, MAX_DB))}`
}

function Channel({ label, db, ariaLabel, silenceLabel }: { label: string; db: number; ariaLabel: string; silenceLabel: string }) {
  const level = Number.isFinite(db) ? db : MIN_DB - 1
  const activeColor = levelColor(level)

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-1" aria-label={ariaLabel}>
      <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div
        className="flex min-h-0 w-5 flex-1 flex-col-reverse gap-[2px] rounded bg-secondary/40 p-[2px]"
        title={`${label}: ${Number.isFinite(db) ? `${db.toFixed(1)} dB` : silenceLabel}`}
      >
        {Array.from({ length: SEGMENTS }, (_, index) => {
          const active = level >= segmentDb(index)
          return (
            <div
              key={index}
              data-active={active ? 'true' : 'false'}
              data-color={active ? activeColor : undefined}
              className={`min-h-0 flex-1 rounded-[1px] transition-colors duration-75 ${
                active ? activeColor : 'bg-secondary'
              }`}
            />
          )
        })}
      </div>
      <span className="font-mono text-[9px] tabular-nums text-muted-foreground">{formatLevel(db)}</span>
    </div>
  )
}

export function StereoVuMeter({ leftDb, rightDb }: Props) {
  const { t } = useDashboardI18n()
  return (
    <section
   className="flex h-full min-h-[120px] flex-col rounded-panel border border-border bg-card p-2 "
      aria-label={t('live.vu.ariaLabel')}
    >
      <p className="text-center text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t('live.vu.program')}
      </p>
      <div className="mt-1 flex min-h-0 flex-1 items-stretch justify-center gap-3">
        <Channel label="L" db={leftDb} ariaLabel={t('live.vu.left')} silenceLabel={t('live.vu.silence')} />
        <Channel label="R" db={rightDb} ariaLabel={t('live.vu.right')} silenceLabel={t('live.vu.silence')} />
      </div>
      <div className="mt-1 flex justify-between px-1 text-[8px] font-mono text-muted-foreground">
        <span>-60</span>
        <span>-18</span>
        <span>0</span>
      </div>
    </section>
  )
}
