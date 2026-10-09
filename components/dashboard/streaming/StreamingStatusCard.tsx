'use client'

// =====================================================
// StreamingStatusCard — estado en vivo del stream
// =====================================================

import { useState } from 'react'
import type { StreamStatus } from '@/lib/useStreamingStatus'
import { useToast } from '@/components/ui/toast'

interface Props {
  status: StreamStatus | null
  loading: boolean
  onRefresh?: () => void
}

export function StreamingStatusCard({ status, loading, onRefresh }: Props) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  if (loading && !status) {
    return (
      <div className="bg-card rounded-lg p-6 animate-pulse">
        <div className="h-4 bg-secondary rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-secondary rounded w-2/3"></div>
      </div>
    )
  }

  if (!status?.hasRadioStream) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-6">
        <h3 className="text-yellow-200 font-semibold mb-2">Sin RadioStream</h3>
        <p className="text-yellow-100/80 text-sm">
          Este cliente no tiene un RadioStream configurado. Contacta al administrador.
        </p>
      </div>
    )
  }

  const isRunning = status.process?.running
  const listeners = status.icecast?.listeners ?? 0
  const listenerPeak = status.icecast?.listener_peak ?? 0
  const bitrate = status.icecast?.bitrate ?? status.db?.bitrate ?? 128
  const isDjLive = status.dj?.connected
  const djName = status.dj?.name

  const streamUrl = status.streamUrl || status.icecast?.listenurl || null

  const copyUrl = () => {
    if (!streamUrl) return
    navigator.clipboard.writeText(streamUrl)
    setCopied(true)
    toast({ type: 'success', title: 'URL copiada al portapapeles' })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-card rounded-lg shadow-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className={`inline-block w-3 h-3 rounded-full ${isRunning ? 'bg-red-500 animate-pulse' : 'bg-secondary'}`}></span>
            {status.clientName || 'Mi Radio'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Mount: <code className="text-brand">/{status.mount}</code>
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-sm px-3 py-1 rounded bg-secondary hover:bg-secondary text-foreground"
          >
            ↻ Refrescar
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-background/60 rounded p-3">
          <div className="text-xs text-muted-foreground uppercase">Estado</div>
          <div className="text-lg font-semibold mt-1">
            {isRunning ? (
              isDjLive ? (
                <span className="text-green-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  {djName ? djName : 'EN VIVO'}
                </span>
              ) : (
                <span className="text-brand">ON AIR</span>
              )
            ) : (
              <span className="text-muted-foreground">OFF</span>
            )}
          </div>
        </div>
        <div className="bg-background/60 rounded p-3">
          <div className="text-xs text-muted-foreground uppercase">Oyentes</div>
          <div className="text-lg font-semibold mt-1 text-foreground">
            {listeners}
            {listenerPeak > 0 && <span className="text-xs text-muted-foreground ml-1">(peak {listenerPeak})</span>}
          </div>
        </div>
        <div className="bg-background/60 rounded p-3">
          <div className="text-xs text-muted-foreground uppercase">Bitrate</div>
          <div className="text-lg font-semibold mt-1 text-foreground">{bitrate} kbps</div>
        </div>
        <div className="bg-background/60 rounded p-3">
          <div className="text-xs text-muted-foreground uppercase">PID</div>
          <div className="text-lg font-semibold mt-1 text-foreground">
            {status.process?.pid ?? '—'}
          </div>
        </div>
      </div>

      {/* URL de transmisión + acciones */}
      {streamUrl && (
        <div className="bg-background/60 rounded p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase">URL de transmisión</div>
          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={streamUrl}
              className="flex-1 bg-background text-brand px-3 py-2 rounded border border-border font-mono text-sm"
              onClick={(e) => e.currentTarget.select()}
            />
            <a
              href={streamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-brand hover:bg-brand text-white font-medium rounded text-center whitespace-nowrap"
            >
              ▶ Escuchar stream
            </a>
            <button
              onClick={copyUrl}
              className="px-4 py-2 bg-secondary hover:bg-secondary text-foreground rounded whitespace-nowrap"
            >
              {copied ? '✓ Copiado' : '📋 Copiar URL'}
            </button>
          </div>
          {isRunning && (
            <p className="text-xs text-green-400">
              ✓ Stream activo. Haz clic en "Escuchar stream" para abrirlo en una nueva pestaña.
            </p>
          )}
        </div>
      )}

      {isRunning && isDjLive && (
        <div className="bg-green-900/30 border border-green-700 rounded p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase">
            <span className="text-green-400">🔴</span>
            <span className="text-green-300 font-semibold">Transmitiendo DJ en vivo</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <div>
              <p className="text-foreground font-semibold text-lg">{djName || 'DJ en vivo'}</p>
              <p className="text-muted-foreground text-sm">El AutoDJ se reanudará al desconectar</p>
            </div>
          </div>
        </div>
      )}

      {isRunning && !isDjLive && status.nowPlaying && status.nowPlaying.playlist && (
        <div className="bg-background/60 rounded p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase">
            <span>🎵</span>
            <span>Ahora suena</span>
            <span className="flex-1"></span>
            <span className="text-brand">{status.nowPlaying.playlist.name}</span>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-1.5 h-full min-h-[3rem] bg-brand rounded-full flex-shrink-0 mt-1"></div>
            {status.nowPlaying.currentTrack?.coverUrl && (
              <img
                src={status.nowPlaying.currentTrack.coverUrl}
                alt="Carátula"
                className="w-14 h-14 rounded object-cover flex-shrink-0 mt-0.5 shadow-md"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <div className="flex-1 min-w-0">
              {status.nowPlaying.currentTrack ? (
                <>
                  <p className="text-foreground font-semibold truncate flex items-center gap-2">
                    {status.nowPlaying.currentTrack.title || 'Sin título'}
                    {status.nowPlaying.currentTrack.isJingle && (
                      <span className="text-xs bg-amber-600 text-white px-1.5 py-0.5 rounded font-normal">JINGLE</span>
                    )}
                  </p>
                  {status.nowPlaying.currentTrack.artist && (
                    <p className="text-muted-foreground text-sm truncate">
                      {status.nowPlaying.currentTrack.artist}
                      {status.nowPlaying.currentTrack.album && ` — ${status.nowPlaying.currentTrack.album}`}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Esperando metadata...</p>
              )}
            </div>
          </div>

          {status.nowPlaying.nextTrack && (
            <div className="flex items-start gap-4 opacity-70">
              <div className="w-1.5 h-full min-h-[2.5rem] bg-secondary rounded-full flex-shrink-0 mt-1"></div>
              {status.nowPlaying.nextTrack.coverUrl && (
                <img
                  src={status.nowPlaying.nextTrack.coverUrl}
                  alt=""
                  className="w-10 h-10 rounded object-cover flex-shrink-0 mt-0.5 shadow-md"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase mb-0.5">⏭ Siguiente</p>
                <p className="text-muted-foreground font-medium truncate flex items-center gap-2">
                  {status.nowPlaying.nextTrack.title || 'Sin título'}
                  {status.nowPlaying.nextTrack.isJingle && (
                    <span className="text-xs bg-amber-600/70 text-white px-1.5 py-0.5 rounded font-normal">JINGLE</span>
                  )}
                </p>
                {status.nowPlaying.nextTrack.artist && (
                  <p className="text-muted-foreground text-sm truncate">
                    {status.nowPlaying.nextTrack.artist}
                  </p>
                )}
              </div>
            </div>
          )}

          {status.nowPlaying.position && (
            <p className="text-xs text-muted-foreground">
              Track {status.nowPlaying.position.index} de {status.nowPlaying.position.total}
            </p>
          )}
        </div>
      )}

      {status.db?.lastError && (
        <div className="bg-red-900/30 border border-red-700 rounded p-3 text-sm text-red-200">
          <strong>Error:</strong> {status.db.lastError}
        </div>
      )}
    </div>
  )
}
