'use client'

import { useStreamingStatus } from '@/lib/useStreamingStatus'

function TrackRow(props: { track: { title: string; artist?: string; coverUrl?: string; isJingle?: boolean } | null; label: string }) {
  const track = props.track
  const label = props.label
  return (
    <div className="flex items-center gap-3">
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden shadow-lg bg-gray-900 shrink-0 ring-1 ring-white/5">
        {track?.coverUrl ? (
          <img
            src={track.coverUrl}
            alt={track.title || 'Carátula'}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-medium mb-1">{label}</div>
        {track ? (
          <>
            <div className="flex items-center gap-2">
              <p className="text-white font-semibold truncate text-sm md:text-base">{track.title || 'Sin título'}</p>
              {track.isJingle && (
                <span className="text-[10px] bg-amber-600/80 text-white px-1.5 py-0.5 rounded font-medium shrink-0">JINGLE</span>
              )}
            </div>
            {track.artist && (
              <p className="text-gray-400 text-xs truncate mt-0.5">{track.artist}</p>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-xs">Esperando...</p>
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
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gray-700" />
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
      {isDjLive ? (
        <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/20 border border-green-700/30 rounded-xl p-4 md:p-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex w-4 h-4">
                <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                <span className="relative rounded-full w-4 h-4 bg-green-500" />
              </span>
              <span className="text-green-400 font-bold text-lg uppercase tracking-wider">EN VIVO</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="text-green-300 font-semibold text-base">{djName || 'DJ conectado'}</span>
            </div>
          </div>
          <p className="text-green-400/60 text-xs mt-3 ml-1">
            Transmisión en vivo — los temas del AutoDJ se reproducirán al finalizar
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-6">
          <span className="w-3 h-3 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/20" />
          <span className="text-gray-300 font-semibold text-sm uppercase tracking-wider">AutoDJ</span>
        </div>
      )}

      {nowPlaying?.playlist && !isDjLive && (
        <div className="mb-5 flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-widest text-gray-500 font-medium">Playlist</span>
          <div className="h-px flex-1 bg-gradient-to-r from-gray-700/50 to-transparent" />
          <span className="text-sm font-semibold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/20">
            {nowPlaying.playlist.name}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          {isDjLive && (
            <div className="flex items-center gap-1.5 text-[10px] text-cyan-400/70 uppercase tracking-wider font-medium mb-2">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              AutoDJ encolado
            </div>
          )}
          <TrackRow track={current} label="Ahora suena" />
          {current && <div className="h-px bg-gradient-to-r from-gray-700/50 to-transparent" />}
        </div>
        <div className="space-y-2">
          <TrackRow track={next} label={isDjLive ? 'Siguiente' : 'Siguiente'} />
          {isDjLive && (
            <div className="flex items-center gap-2 text-xs text-cyan-400/60 bg-cyan-500/5 border border-cyan-500/10 rounded-lg px-3 py-2">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Estos temas del AutoDJ se reproducirán al desconectar el DJ
            </div>
          )}
        </div>
      </div>

      {nowPlaying?.position && !isDjLive && (
        <div className="mt-5 flex items-center gap-2 text-xs text-gray-500">
          <span className="w-1 h-1 rounded-full bg-gray-600" />
          Track {nowPlaying.position.index} de {nowPlaying.position.total}
        </div>
      )}
    </div>
  )
}
