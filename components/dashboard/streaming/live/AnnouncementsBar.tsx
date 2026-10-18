'use client'

import { ClockIcon, CloudIcon } from '@heroicons/react/24/outline'
import type { AnnouncementType } from '@/lib/live-console/use-live-console'

interface Props {
  loading: AnnouncementType | null
  error: string | null
  onAnnounce: (type: AnnouncementType) => Promise<void>
}

export function AnnouncementsBar({ loading, error, onAnnounce }: Props) {
  const busy = loading != null
  return (
    <section className="rounded-xl border border-border bg-card p-3 shadow-soft">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-foreground">Locución</span>
        <button
          type="button"
          onClick={() => void onAnnounce('weather')}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:text-brand disabled:opacity-40"
          title="Anunciar el clima de la ciudad configurada"
        >
          <CloudIcon className="h-3.5 w-3.5" />
          Clima
        </button>
        <button
          type="button"
          onClick={() => void onAnnounce('time')}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:text-brand disabled:opacity-40"
          title="Anunciar la hora local de la radio"
        >
          <ClockIcon className="h-3.5 w-3.5" />
          Hora
        </button>
        {loading && (
          <span className="text-[10px] text-muted-foreground">
            Generando {loading === 'weather' ? 'clima' : 'hora'}…
          </span>
        )}
        {error && <span className="text-[10px] text-red-300">{error}</span>}
        <span className="ml-auto text-[10px] text-muted-foreground">
          Baja la música durante el anuncio.
        </span>
      </div>
    </section>
  )
}
