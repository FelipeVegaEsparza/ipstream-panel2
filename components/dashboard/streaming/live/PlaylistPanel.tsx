'use client'

import { ChevronDownIcon, ChevronUpIcon, PlayIcon, QueueListIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { formatTime } from '@/lib/live-console/audio-math'
import type { LocalTrack } from '@/lib/live-console/types'

interface Props {
  queue: LocalTrack[]
  onPlayNow: (track: LocalTrack) => Promise<void>
  onRemove: (id: string) => void
  onClear: () => void
  onMove: (id: string, direction: -1 | 1) => void
}

export function PlaylistPanel({
  queue,
  onPlayNow,
  onRemove,
  onClear,
  onMove,
}: Props) {
  return (
    <section className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <QueueListIcon className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-semibold text-foreground">Lista de reproducción</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground">
            {queue.length} en cola
          </span>
          {queue.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-[10px] text-muted-foreground transition-colors hover:text-red-400"
            >
              Vaciar
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {queue.length === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-medium text-foreground">La lista está vacía</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Agregá canciones desde el navegador de archivos con el botón “+”.
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {queue.map((track, index) => (
              <li key={track.id} className="group rounded-lg px-2 py-2 hover:bg-secondary/60">
                <div className="flex items-center gap-2">
                  <span className="w-5 text-right font-mono text-[10px] text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{track.title}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {track.artist || '—'} · {formatTime(track.duration)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => void onPlayNow(track)}
                      className="rounded-md p-1.5 text-muted-foreground hover:text-brand"
                      title="Reproducir ahora"
                      aria-label={`Reproducir ${track.title}`}
                    >
                      <PlayIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMove(track.id, -1)}
                      disabled={index === 0}
                      className="rounded-md p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Subir"
                      aria-label={`Subir ${track.title}`}
                    >
                      <ChevronUpIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMove(track.id, 1)}
                      disabled={index === queue.length - 1}
                      className="rounded-md p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Bajar"
                      aria-label={`Bajar ${track.title}`}
                    >
                      <ChevronDownIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(track.id)}
                      className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                      title="Quitar de la lista"
                      aria-label={`Quitar ${track.title} de la lista`}
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
