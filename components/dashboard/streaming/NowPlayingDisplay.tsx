'use client'

import { useStreamingStatus } from '@/lib/useStreamingStatus'

function TrackRow({ track, label }: { track: { title?: string | null; artist?: string | null; coverUrl?: string | null; isJingle?: boolean } | null; label: string }) {
  return (
    <div className="flex items-center gap-4">
      {/* Cover */}
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden shadow-lg bg-gray-900 shrink-0 ring-1 ring-white/5">
        {track?.coverUrl ? (
          <img
            src={track.coverUrl}
            alt={track.title || 'Carátula'}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-gray-500 uppercase tracking-widest font-medium mb-1.5">{label}</div>
        {track ? (
          <>
            <div className="flex items-center gap-2">
              <p className="text-white font-semibold truncate text-base md:text-lg">{track.title || 'Sin título'}</p>
              {track.isJingle && (
                <span className="text-[10px] bg-amber-600/80 text-white px-1.5 py-0.5 rounded font-medium shrink-0">JINGLE</span>
              )}
            </div>
            {track.artist && (
              <p className="text-gray-400 text-sm truncate mt-0.5">{track.artist}</p>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-sm">Esperando...</p>
        )}
      </div>
    </div>
  )
}

export function NowPlayingDisplay() {
  const { status, loading } = useStreamingStatus({ pollingMs: 5000 })

  if (loading && !status) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl p-6 md:p-8 animate-pulse">
        <div className="h-5 bg-gray-700 rounded w-32 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-700 rounded w-16" />
                <div className="h-5 bg-gray-700 rounded w-3/4" />
                <div className="h-4 bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!status?.hasRadioStream) return null
  if (!status.process?.running) return null

  const nowPlaying = status.nowPlaying
  const current = nowPlaying?.currentTrack
  const next = nowPlaying?.nextTrack
  const isDjLive = status.dj?.connected
  const djName = status.dj?.name

  return (
    <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/40 shadow-xl p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {isDjLive ? (
            <>
              <span className="relative flex w-3 h-3">
                <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                <span className="relative rounded-full w-3 h-3 bg-green-500" />
              </span>
              <span className="text-green-400 font-semibold text-sm uppercase tracking-wider">
                {djName ? `DJ: ${djName}` : 'En vivo'}
              </span>
            </>
          ) : (
            <>
              <span className="w-3 h-3 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/20" />
              <span className="text-gray-300 font-semibold text-sm uppercase tracking-wider">AutoDJ</span>
            </>
          )}
        </div>
        )}
      </div>

      {/* Playlist name */}
      {nowPlaying?.playlist && !isDjLive && (
        <div className="mb-6 flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-widest text-gray-500 font-medium">Playlist</span>
          <div className="h-px flex-1 bg-gradient-to-r from-gray-700/50 to-transparent" />
          <span className="text-sm font-semibold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/20">
            {nowPlaying.playlist.name}
          </span>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <TrackRow track={current} label="Ahora suena" />
          {current && <div className="h-px bg-gradient-to-r from-gray-700/50 to-transparent" />}
        </div>
        <div className="space-y-3">
          <TrackRow track={next} label={isDjLive ? 'Espera turno' : 'Siguiente'} />
          {isDjLive && (
            <div className="flex items-center gap-2 text-xs text-green-400/70 bg-green-500/5 border border-green-500/10 rounded-lg px-3 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
              {djName ? `${djName} está al aire — AutoDJ reanuda al finalizar` : 'DJ en vivo — AutoDJ esperando'}
            </div>
          )}
        </div>
      </div>

      {/* Position */}
      {nowPlaying?.position && !isDjLive && (
        <div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
          <span className="w-1 h-1 rounded-full bg-gray-600" />
          Track {nowPlaying.position.index} de {nowPlaying.position.total}
        </div>
      )}
    </div>
  )
}
