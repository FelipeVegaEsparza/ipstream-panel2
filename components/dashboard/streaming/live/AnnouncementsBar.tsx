'use client'

import { ClockIcon, CloudIcon } from '@heroicons/react/24/outline'
import type { AnnouncementType, AnnouncementVoice } from '@/lib/live-console/use-live-console'

interface Props {
  loading: AnnouncementType | null
  error: string | null
  voice: AnnouncementVoice
  onVoice: (voice: AnnouncementVoice) => void
  onAnnounce: (type: AnnouncementType) => Promise<void>
}

export function AnnouncementsBar({ loading, error, voice, onVoice, onAnnounce }: Props) {
  const busy = loading != null
  return (
    <aside className="flex h-full min-h-[180px] flex-col rounded-xl border border-border bg-card p-3 shadow-soft">
      <h2 className="text-sm font-semibold text-foreground">Locución</h2>
      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
        Clima y hora con voz latina.
      </p>

      <div className="mt-3 space-y-2">
        <button
          type="button"
          onClick={() => void onAnnounce('weather')}
          disabled={busy}
          className="flex w-full items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:text-brand disabled:opacity-40"
          title="Anunciar el clima de la ciudad configurada"
        >
          <CloudIcon className="h-3.5 w-3.5" />
          Clima
        </button>
        <button
          type="button"
          onClick={() => void onAnnounce('time')}
          disabled={busy}
          className="flex w-full items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:text-brand disabled:opacity-40"
          title="Anunciar la hora local de la radio"
        >
          <ClockIcon className="h-3.5 w-3.5" />
          Hora
        </button>
      </div>

      <label className="mt-3 space-y-1">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Voz</span>
        <select
          value={voice}
          onChange={(event) => onVoice(event.target.value === 'female' ? 'female' : 'male')}
          className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none focus:border-brand"
          aria-label="Voz de la locución"
        >
          <option value="male">Ald (latino)</option>
          <option value="female">Claude (latino)</option>
        </select>
      </label>

      {loading && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Generando {loading === 'weather' ? 'clima' : 'hora'}…
        </p>
      )}
      {error && <p className="mt-2 text-[10px] text-red-300">{error}</p>}

      <p className="mt-auto pt-3 text-[9px] leading-snug text-muted-foreground">
        Se mezcla al aire y baja la música durante el anuncio.
      </p>
    </aside>
  )
}
