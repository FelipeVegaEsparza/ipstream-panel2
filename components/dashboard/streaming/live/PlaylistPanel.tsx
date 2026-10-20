'use client'

import { useState } from 'react'
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MusicalNoteIcon,
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
  onReorder?: (fromIndex: number, toIndex: number) => void
}

const QUEUE_DRAG = 'application/x-ipstream-queue-index'

function rowTone(track: LocalTrack): string {
  if (track.kind === 'jingle') return 'playlist-row-jingle'
  if (track.kind === 'spot' || track.kind === 'announcement') return 'playlist-row-locution'
  return ''
}

function TrackBadge({ track }: { track: LocalTrack }) {
  if (track.kind === 'spot' || track.kind === 'announcement') {
    return (
      <span className="ml-1 inline-flex shrink-0 items-center gap-0.5 rounded bg-[var(--locution-soft)] px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[color:var(--locution-500)]">
        <SparklesIcon className="h-2.5 w-2.5" />
        Locución
      </span>
    )
  }
  if (track.kind === 'jingle') {
    return (
      <span className="ml-1 inline-flex shrink-0 items-center gap-0.5 rounded bg-secondary px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
        <MusicalNoteIcon className="h-2.5 w-2.5" />
        Jingle
      </span>
    )
  }
  return null
}

export function PlaylistPanel({
  queue,
  history,
  onPlayNow,
  onRemove,
  onClear,
  onMove,
  onDropTrack,
  onReorder,
}: Props) {
  const recent = [...history].reverse()
  const [dragOver, setDragOver] = useState(false)
  const [dragSource, setDragSource] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [dropAfter, setDropAfter] = useState(false)

  const resetDrag = () => {
    setDragSource(null)
    setDropIndex(null)
    setDropAfter(false)
  }

  return (
    <section
      className={`flex h-full min-h-[420px] flex-col overflow-hidden rounded-lg border bg-card shadow-soft transition-colors ${
        dragOver ? 'border-brand ring-1 ring-brand/30' : 'border-border'
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
      <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <QueueListIcon className="h-4 w-4 text-brand" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Lista de reproducción
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
            {queue.length} en cola
          </span>
          {history.length > 0 && (
            <span className="font-mono text-[9px] text-muted-foreground">
              {history.length} {history.length === 1 ? 'sonó' : 'sonaron'}
            </span>
          )}
          {queue.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-[9px] text-muted-foreground transition-colors hover:text-red-400"
              title="Vaciar solo la cola; el historial se conserva"
            >
              Vaciar cola
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[24px_minmax(0,1fr)_48px_auto] items-center gap-1 border-b border-border bg-background/60 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="text-right">#</span>
        <span>Tema / Artista</span>
        <span className="text-right">Dur.</span>
        <span className="text-right">Acciones</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {queue.length === 0 && history.length === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-6 text-center">
            <p className="text-xs font-medium text-foreground">La lista está vacía</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Agregá canciones desde la biblioteca con “+”.
            </p>
          </div>
        ) : (
          <>
            {recent.length > 0 && (
              <div>
                <p className="border-b border-border/60 bg-background/40 px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Ya sonaron
                </p>
                <ul className="divide-y divide-border/40">
                  {recent.map((track) => (
                    <li
                      key={`history-${track.id}`}
                      className={`group grid grid-cols-[24px_minmax(0,1fr)_48px_auto] items-center gap-1 px-2 py-1.5 opacity-60 ${rowTone(track)}`}
                    >
                      <CheckCircleIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="flex items-center truncate text-[10px] font-medium text-muted-foreground">
                          <span className="truncate">{track.title}</span>
                          <TrackBadge track={track} />
                        </p>
                        <p className="truncate text-[9px] text-muted-foreground/70">{track.artist || '—'}</p>
                      </div>
                      <span className="text-right font-mono text-[9px] tabular-nums text-muted-foreground">
                        {formatTime(track.duration)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void onPlayNow(track)}
                        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-brand group-hover:opacity-100"
                        title="Volver a reproducir"
                        aria-label={`Volver a reproducir ${track.title}`}
                      >
                        <PlayIcon className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {queue.length > 0 && (
              <div>
                {recent.length > 0 && (
                  <p className="border-b border-border/60 bg-background/40 px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    A continuación
                  </p>
                )}
                <ul className="divide-y divide-border/40">
                  {queue.map((track, index) => (
                    <li
                      key={track.id}
                      draggable={Boolean(onReorder)}
                      onDragStart={(event) => {
                        if (!onReorder) return
                        event.dataTransfer.setData(QUEUE_DRAG, String(index))
                        event.dataTransfer.effectAllowed = 'move'
                        setDragSource(index)
                      }}
                      onDragEnd={resetDrag}
                      onDragOver={(event) => {
                        if (!onReorder || !event.dataTransfer.types.includes(QUEUE_DRAG)) return
                        event.preventDefault()
                        event.stopPropagation()
                        event.dataTransfer.dropEffect = 'move'
                        const rect = event.currentTarget.getBoundingClientRect()
                        setDropIndex(index)
                        setDropAfter(event.clientY > rect.top + rect.height / 2)
                      }}
                      onDrop={(event) => {
                        if (!onReorder) return
                        const raw = event.dataTransfer.getData(QUEUE_DRAG)
                        if (!raw) return
                        event.preventDefault()
                        event.stopPropagation()
                        const from = Number(raw)
                        if (!Number.isInteger(from)) { resetDrag(); return }
                        const rect = event.currentTarget.getBoundingClientRect()
                        const after = event.clientY > rect.top + rect.height / 2
                        let to = index + (after ? 1 : 0)
                        if (from < to) to -= 1
                        onReorder(from, to)
                        resetDrag()
                      }}
                      className={`group grid grid-cols-[24px_minmax(0,1fr)_48px_auto] items-center gap-1 px-2 py-1.5 transition-colors ${
                        onReorder ? 'cursor-grab active:cursor-grabbing' : ''
                      } ${
                        dropIndex === index ? (dropAfter ? 'border-b-2 border-brand' : 'border-t-2 border-brand') : ''
                      } ${
                        dragSource === index ? 'opacity-40' : ''
                      } ${rowTone(track) || 'hover:bg-brand/5'}`}
                    >
                      <span className="text-right font-mono text-[9px] tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center truncate text-[11px] font-medium text-foreground">
                          <span className="truncate">{track.title}</span>
                          <TrackBadge track={track} />
                        </p>
                        <p className="truncate text-[9px] text-muted-foreground">{track.artist || '—'}</p>
                      </div>
                      <span className="text-right font-mono text-[9px] tabular-nums text-muted-foreground">
                        {formatTime(track.duration)}
                      </span>
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => void onPlayNow(track)}
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-brand"
                          title="Reproducir ahora"
                          aria-label={`Reproducir ${track.title}`}
                        >
                          <PlayIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMove(track.id, -1)}
                          disabled={index === 0}
                          className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-20"
                          title="Subir"
                          aria-label={`Subir ${track.title}`}
                        >
                          <ChevronUpIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMove(track.id, 1)}
                          disabled={index === queue.length - 1}
                          className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-20"
                          title="Bajar"
                          aria-label={`Bajar ${track.title}`}
                        >
                          <ChevronDownIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(track.id)}
                          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                          title="Quitar de la lista"
                          aria-label={`Quitar ${track.title} de la lista`}
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
