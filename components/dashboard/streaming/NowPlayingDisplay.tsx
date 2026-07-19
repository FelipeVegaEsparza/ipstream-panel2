'use client'

import { useStreamingStatus } from '@/lib/useStreamingStatus'

export function NowPlayingDisplay() {
  const { status, loading } = useStreamingStatus({ pollingMs: 5000 })

  if (loading && !status) {
    return (
      <div className="bg-gray-800 rounded-2xl p-8 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/4 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="aspect-square bg-gray-700 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-4 bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      </div>
    )
  }

  if (!status?.hasRadioStream) return null

  const isRunning = status.process?.running
  const nowPlaying = status.nowPlaying
  const current = nowPlaying?.currentTrack
  const next = nowPlaying?.nextTrack
  const isDjLive = status.dj?.connected
  const djName = status.dj?.name

  if (!isRunning) return null

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-gray-700/50 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {isDjLive ? (
            <>
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 font-semibold text-sm uppercase tracking-wider">
                {djName ? `DJ: ${djName}` : 'DJ en vivo'}
              </span>
            </>
          ) : (
            <>
              <span className="w-3 h-3 bg-cyan-500 rounded-full" />
              <span className="text-cyan-400 font-semibold text-sm uppercase tracking-wider">AutoDJ</span>
            </>
          )}
        </div>
        {nowPlaying?.playlist && !isDjLive && (
          <span className="text-xs text-gray-500">{nowPlaying.playlist.name}</span>
        )}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Current track */}
        <div className="space-y-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Ahora suena</div>
          {current ? (
            <>
              <div className="aspect-square w-full rounded-2xl overflow-hidden shadow-2xl bg-gray-900">
                {current.coverUrl ? (
                  <img
                    src={current.coverUrl}
                    alt={current.title || 'Carátula'}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-20 h-20 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white text-lg md:text-xl font-bold truncate">{current.title || 'Sin título'}</p>
                  {current.isJingle && (
                    <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded font-medium shrink-0">JINGLE</span>
                  )}
                </div>
                {current.artist && (
                  <p className="text-gray-400 text-sm mt-1 truncate">{current.artist}</p>
                )}
              </div>
            </>
          ) : (
            <div className="aspect-square w-full rounded-2xl bg-gray-900/60 flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p className="text-gray-500 text-sm">Esperando metadata...</p>
              </div>
            </div>
          )}
        </div>

        {/* Next track */}
        <div className="space-y-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">
            {isDjLive ? 'Siguiente (AutoDJ esperando)' : 'Siguiente'}
          </div>
          {next ? (
            <>
              <div className="aspect-square w-full rounded-2xl overflow-hidden shadow-2xl bg-gray-900 opacity-80">
                {next.coverUrl ? (
                  <img
                    src={next.coverUrl}
                    alt={next.title || 'Carátula'}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-20 h-20 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white text-lg md:text-xl font-bold truncate">{next.title || 'Sin título'}</p>
                  {next.isJingle && (
                    <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded font-medium shrink-0">JINGLE</span>
                  )}
                </div>
                {next.artist && (
                  <p className="text-gray-400 text-sm mt-1 truncate">{next.artist}</p>
                )}
              </div>
            </>
          ) : (
            <div className="aspect-square w-full rounded-2xl bg-gray-900/60 flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <p className="text-gray-500 text-sm">Esperando...</p>
              </div>
            </div>
          )}

          {isDjLive && (
            <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-4 text-sm">
              <div className="flex items-center gap-2 text-green-400 font-medium mb-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {djName ? `${djName} transmitiendo` : 'DJ conectado'}
              </div>
              <p className="text-green-300/70 text-xs">
                El AutoDJ tomará el control cuando termine la transmisión en vivo.
              </p>
            </div>
          )}
        </div>
      </div>

      {nowPlaying?.position && !isDjLive && (
        <div className="mt-4 text-xs text-gray-500">
          Track {nowPlaying.position.index} de {nowPlaying.position.total}
        </div>
      )}
    </div>
  )
}
