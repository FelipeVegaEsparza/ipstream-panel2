'use client'

import { useState } from 'react'
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlayIcon,
  QueueListIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { formatTime } from '@/lib/live-console/audio-math'
import type { LocalTrack } from '@/lib/live-console/types'

interface Props {
  queue: LocalTrack[]
  history: LocalTrack[]
  onPlayNow: (track: LocalTrack) => Promise<void>
  onRemove: (id: string) => void
  onClear: () => void
  onMove: (id: string, direction: -1 | 1) => void
  onDropTrack?: (track: LocalTrack) => void
}

function LocutionBadge({ track }: { track: LocalTrack }) {
  if (track.kind !== 'spot') return null
  return (
    <span className="ml-1 inline-flex shrink-0 items-center gap-0.5 rounded bg-brand/15 px-1 py-0.5 text-[9px] font-medium text-brand">
      <SparklesIcon className="h-2.5 w-2.5" />
      Locución
    </span>
  )
}

export function PlaylistPanel({
  queue,
  history,
  onPlayNow,
  onRemove,
  onClear,
  onMove,
  onDropTrack,
}: Props) {
  const recent = [...history].reverse()
  const [dragOver, setDragOver] = useState(false)

  return (
    <section
      className={`flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl border bg-card shadow-soft transition-colors ${
        dragOver ? 'border-brand ring-2 ring-brand/20' : 'border-border'
      }`}
      onDragOver={(event) => {
        if (!onDropTrack || !event.dataTransfer.types.includes('application/x-ipstream-track')) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
        setDragOver(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false)
      }}
      onDrop={(event) => {
        if (!onDropTrack) return
        const raw = event.dataTransfer.getData('application/x-ipstream-track')
        if (!raw) return
        event.preventDefault()
        setDragOver(false)
        try {
          const track = JSON.parse(raw) as LocalTrack
          if (track?.id && track?.title) onDropTrack(track)
        } catch {}
      }}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <QueueListIcon className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-semibold text-foreground">Lista de reproducción</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground">
            {queue.length} en cola
          </span>
          {history.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {history.length} {history.length === 1 ? 'sonó' : 'sonaron'}
            </span>
          )}
          {queue.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-[10px] text-muted-foreground transition-colors hover:text-red-400"
              title="Vaciar solo la cola; el historial se conserva"
            >
              Vaciar cola
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {queue.length === 0 && history.length === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-medium text-foreground">La lista está vacía</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Agregá canciones desde el navegador de archivos con el botón “+”.
            </p>
          </div>
        ) : (
          <>
            {recent.length > 0 && (
              <div className="mb-2">
                <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Ya sonaron
                </p>
                <ul className="space-y-0.5">
                  {recent.map((track) => (
                    <li key={`history-${track.id}`} className="group rounded-lg px-2 py-1.5">
                      <div className="flex items-center gap-2 opacity-65">
                        <CheckCircleIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center truncate text-[11px] font-medium text-muted-foreground">
                            <span className="truncate">{track.title}</span>
                            <LocutionBadge track={track} />
                          </p>
                          <p className="truncate text-[9px] text-muted-foreground/70">
                            {track.artist || '—'} · {formatTime(track.duration)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void onPlayNow(track)}
                          className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-brand group-hover:opacity-100"
                          title="Volver a reproducir"
                          aria-label={`Volver a reproducir ${track.title}`}
                        >
                          <PlayIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recent.length > 0 && queue.length > 0 && (
              <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                A continuación
              </p>
            )}

            {queue.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-xs font-medium text-foreground">No hay temas en cola</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  El historial de arriba se conserva.
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
                        <p className="flex items-center truncate text-xs font-medium text-foreground">
                          <span className="truncate">{track.title}</span>
                          <LocutionBadge track={track} />
                        </p>
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
          </>
        )}
      </div>
    </section>
  )
}
