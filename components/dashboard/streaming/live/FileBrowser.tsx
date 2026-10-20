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
      className={`flex h-full min-h-[420px] flex-col overflow-hidden rounded-lg border bg-card shadow-soft ${
        dragging ? 'border-brand ring-1 ring-brand/30' : 'border-border'
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
      <div className="border-b border-border bg-secondary/30 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Biblioteca local
            </h2>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              {tracks.length} archivo{tracks.length === 1 ? '' : 's'} · no se sube al servidor
            </p>
          </div>
          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-medium ${
            persisted
              ? 'border-brand/30 bg-brand/10 text-brand'
              : 'border-border bg-background text-muted-foreground'
          }`}>
            {persisted ? 'Fija' : 'Sesión'}
          </span>
        </div>

        <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded bg-brand px-2 py-1.5 text-[10px] font-medium text-white transition-opacity hover:opacity-90"
          >
            + Archivos
          </button>
          {supportsPersistence ? (
            <button
              type="button"
              onClick={() => void onAddDirectory()}
              className="flex items-center justify-center gap-1 rounded border border-border bg-background px-2 py-1.5 text-[10px] font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
            >
              <FolderPlusIcon className="h-3.5 w-3.5" />
              Carpeta
            </button>
          ) : (
            <div className="flex items-center justify-center rounded border border-dashed border-border px-1 text-center text-[9px] text-muted-foreground">
              Carpeta solo Chromium
            </div>
          )}
          <button
            type="button"
            onClick={() => void onRestoreDirectory()}
            disabled={!persisted || !supportsPersistence || restoring || scanning}
            className="rounded border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:border-brand hover:text-brand disabled:opacity-30"
            title="Actualizar carpeta recordada"
            aria-label="Actualizar carpeta recordada"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${restoring ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.flac,.webm,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) onAddFiles(event.target.files)
            event.target.value = ''
          }}
        />

        {(scanning || restoring) && (
          <div className="mt-2 flex items-center gap-2 text-[9px] text-muted-foreground">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-brand" />
            </div>
            <span>{progress.scanned} archivos · {progress.added} temas</span>
          </div>
        )}

        {error && (
          <p className="mt-2 rounded border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[10px] text-red-300">
            {error}
          </p>
        )}

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar tema, artista o archivo…"
          className="mt-2 w-full rounded border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none placeholder:text-muted-foreground focus:border-brand"
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_46px_72px] items-center gap-1 border-b border-border bg-background/60 px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Tema / Artista</span>
        <span className="text-right">Dur.</span>
        <span className="text-right">Acciones</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-6 text-center">
            <p className="text-xs font-medium text-foreground">Arrastrá música acá</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              MP3, AAC/M4A, WAV, OGG, Opus o FLAC. Después agregala a la lista.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((track) => {
              const inPlaylist = playlistIds.has(track.id)
              return (
                <li
                  key={track.id}
                  className="group grid grid-cols-[minmax(0,1fr)_46px_72px] items-center gap-1 px-3 py-1.5 transition-colors hover:bg-brand/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-foreground">{track.title}</p>
                    <p className="truncate text-[9px] text-muted-foreground">
                      {track.artist || '—'} · {formatSize(track.size)}
                    </p>
                  </div>
                  <span className="text-right font-mono text-[10px] tabular-nums text-muted-foreground">
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
                      onClick={() => onAddToPlaylist(track)}
                      disabled={inPlaylist}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-brand disabled:opacity-30"
                      title={inPlaylist ? 'Ya está en la lista' : 'Agregar a la lista'}
                      aria-label={`Agregar ${track.title} a la lista`}
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveTrack(track.id)}
                      className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                      title="Quitar de la biblioteca"
                      aria-label={`Quitar ${track.title} de la biblioteca`}
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border bg-secondary/30 px-3 py-1.5 text-[9px] text-muted-foreground">
        <span>{filtered.length} visibles / {tracks.length} total</span>
        <span className="font-mono">{playlistIds.size} en lista</span>
      </div>
    </section>
  )
}
