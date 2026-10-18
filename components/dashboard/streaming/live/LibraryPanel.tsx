'use client'

import { useMemo, useRef, useState } from 'react'
import { formatTime } from '@/lib/live-console/audio-math'
import type { DeckId, LocalTrack } from '@/lib/live-console/types'

interface Props {
  tracks: LocalTrack[]
  queue: LocalTrack[]
  scanning: boolean
  restoring: boolean
  progress: { scanned: number; added: number }
  persisted: boolean
  supportsPersistence: boolean
  error: string | null
  onAddFiles: (files: FileList | File[]) => void
  onAddDirectory: () => Promise<void>
  onRestoreDirectory: () => Promise<void>
  onRemoveTrack: (id: string) => void
  onEnqueue: (track: LocalTrack) => void
  onDequeue: (id: string) => void
  onClearQueue: () => void
  onLoadToDeck: (deckId: DeckId, track: LocalTrack) => Promise<void>
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function LibraryPanel({
  tracks,
  queue,
  scanning,
  restoring,
  progress,
  persisted,
  supportsPersistence,
  error,
  onAddFiles,
  onAddDirectory,
  onRestoreDirectory,
  onRemoveTrack,
  onEnqueue,
  onDequeue,
  onClearQueue,
  onLoadToDeck,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [search, setSearch] = useState('')
  const [dragging, setDragging] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tracks
    return tracks.filter((track) =>
      `${track.title} ${track.artist ?? ''} ${track.name}`.toLowerCase().includes(q)
    )
  }, [tracks, search])

  return (
    <aside
      className={`flex min-h-[420px] flex-col rounded-2xl border bg-card shadow-soft ${
        dragging ? 'border-brand' : 'border-border'
      }`}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (event.dataTransfer.files.length > 0) onAddFiles(event.dataTransfer.files)
      }}
    >
      <div className="border-b border-border p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Biblioteca local</h2>
            <p className="text-[11px] text-muted-foreground">
              Los audios quedan en tu equipo, nunca se suben.
            </p>
          </div>
          <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${
            persisted ? 'bg-brand/10 text-brand' : 'bg-secondary text-muted-foreground'
          }`}>
            {persisted ? 'Carpeta recordada' : 'Sesión'}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            Agregar archivos
          </button>
          {supportsPersistence ? (
            <button
              type="button"
              onClick={() => void onAddDirectory()}
              className="rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80"
            >
              Agregar carpeta
            </button>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-3 py-2 text-center text-[10px] text-muted-foreground">
              Carpeta persistente solo en Chromium
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.flac,.webm"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) onAddFiles(event.target.files)
            event.target.value = ''
          }}
        />

        {persisted && supportsPersistence && (
          <button
            type="button"
            onClick={() => void onRestoreDirectory()}
            disabled={restoring || scanning}
            className="mt-2 w-full rounded-lg border border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {restoring ? 'Restaurando…' : 'Actualizar biblioteca de la carpeta'}
          </button>
        )}

        {(scanning || restoring) && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Escaneando…</span>
              <span>{progress.scanned} archivos · {progress.added} tracks</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-brand" />
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
            {error}
          </p>
        )}

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por título, artista o archivo"
          className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-brand"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-medium text-foreground">Arrastrá música acá</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              MP3, AAC/M4A, WAV, OGG, Opus o FLAC. No se sube nada al servidor.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {filtered.map((track) => (
              <li key={track.id} className="group rounded-lg px-2 py-2 hover:bg-secondary/60">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{track.title}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {track.artist || '—'} · {formatTime(track.duration)} · {formatSize(track.size)}
                      {!track.available && <span className="ml-1 text-red-400">· no disponible</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!track.available ? (
                      <button
                        type="button"
                        onClick={() => void onRestoreDirectory()}
                        className="rounded-md bg-secondary px-2 py-1 text-[10px] font-medium text-foreground hover:text-brand"
                        title="Volver a autorizar la carpeta y re-vincular"
                      >
                        Re-vincular
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => void onLoadToDeck('A', track)}
                          className="rounded-md bg-secondary px-2 py-1 text-[10px] font-medium text-foreground hover:text-brand"
                          title="Cargar en Deck A"
                        >
                          A
                        </button>
                        <button
                          type="button"
                          onClick={() => void onLoadToDeck('B', track)}
                          className="rounded-md bg-secondary px-2 py-1 text-[10px] font-medium text-foreground hover:text-brand"
                          title="Cargar en Deck B"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => onEnqueue(track)}
                          className="rounded-md bg-secondary px-2 py-1 text-[10px] font-medium text-foreground hover:text-brand"
                          title="Agregar a la cola"
                        >
                          +
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveTrack(track.id)}
                      className="rounded-md px-1.5 py-1 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                      title="Quitar de la biblioteca"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Cola ({queue.length})
          </h3>
          {queue.length > 0 && (
            <button type="button" onClick={onClearQueue} className="text-[10px] text-muted-foreground hover:text-foreground">
              Vaciar
            </button>
          )}
        </div>
        {queue.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">Agregá tracks con “+” para reproducción automática.</p>
        ) : (
          <ul className="max-h-32 space-y-1 overflow-y-auto">
            {queue.map((track, index) => (
              <li key={track.id} className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5">
                <span className="w-4 text-[10px] text-muted-foreground">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">{track.title}</span>
                <button type="button" onClick={() => onDequeue(track.id)} className="text-[10px] text-muted-foreground hover:text-red-400">
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
