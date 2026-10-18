'use client'

import { useMemo, useRef, useState } from 'react'
import { ArrowPathIcon, FolderPlusIcon, PlayIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { formatTime } from '@/lib/live-console/audio-math'
import type { LocalTrack } from '@/lib/live-console/types'

interface Props {
  tracks: LocalTrack[]
  playlistIds: Set<string>
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
  onAddToPlaylist: (track: LocalTrack) => void
  onPlayNow: (track: LocalTrack) => Promise<void>
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileBrowser({
  tracks,
  playlistIds,
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
  onAddToPlaylist,
  onPlayNow,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [search, setSearch] = useState('')
  const [dragging, setDragging] = useState(false)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return tracks
    return tracks.filter((track) =>
      `${track.title} ${track.artist ?? ''} ${track.name}`.toLowerCase().includes(query)
    )
  }, [tracks, search])

  return (
    <section
      className={`flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border bg-card shadow-soft ${
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Navegador de archivos</h2>
            <p className="text-[11px] text-muted-foreground">
              Tu música queda en este equipo. No se sube al servidor.
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
              className="flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80"
            >
              <FolderPlusIcon className="h-4 w-4" />
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
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            {restoring ? 'Actualizando…' : 'Actualizar carpeta'}
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
          placeholder="Buscar título, artista o archivo"
          className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-brand"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-medium text-foreground">Arrastrá música acá</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              MP3, AAC/M4A, WAV, OGG, Opus o FLAC. Después agregala a la lista de reproducción.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {filtered.map((track) => {
              const inPlaylist = playlistIds.has(track.id)
              return (
                <li key={track.id} className="group rounded-lg px-2 py-2 hover:bg-secondary/60">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{track.title}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {track.artist || '—'} · {formatTime(track.duration)} · {formatSize(track.size)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void onPlayNow(track)}
                        className="rounded-md bg-secondary p-1.5 text-foreground transition-colors hover:text-brand"
                        title="Reproducir ahora"
                        aria-label={`Reproducir ${track.title}`}
                      >
                        <PlayIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddToPlaylist(track)}
                        disabled={inPlaylist}
                        className="rounded-md bg-secondary p-1.5 text-foreground transition-colors hover:text-brand disabled:opacity-40"
                        title={inPlaylist ? 'Ya está en la lista' : 'Agregar a la lista'}
                        aria-label={`Agregar ${track.title} a la lista`}
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveTrack(track.id)}
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                        title="Quitar de la biblioteca"
                        aria-label={`Quitar ${track.title} de la biblioteca`}
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
        {tracks.length} archivo{tracks.length === 1 ? '' : 's'} en la biblioteca
      </div>
    </section>
  )
}
