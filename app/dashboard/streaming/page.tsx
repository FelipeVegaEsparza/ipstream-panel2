'use client'

// =====================================================
// Page — /dashboard/streaming (vista principal)
// =====================================================

import { useState } from 'react'
import { useStreamingStatus } from '@/lib/useStreamingStatus'
import { NowPlayingDisplay } from '@/components/dashboard/streaming/NowPlayingDisplay'
import { StreamControls } from '@/components/dashboard/streaming/StreamControls'
import { PlayHistory } from '@/components/dashboard/streaming/PlayHistory'
import { useToast } from '@/components/ui/toast'

export default function StreamingPage() {
  const { status, refresh } = useStreamingStatus({ pollingMs: 5000 })
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const isRunning = !!status?.process?.running
  const streamUrl = status?.streamUrl || status?.icecast?.listenurl || null
  // Si streamUrl viene relativa (/radio_xxx) y tenemos dominio público,
  // la convertimos a absoluta para que sea compartible externamente.
  const absoluteStreamUrl = streamUrl && streamUrl.startsWith('/') && process.env.NEXT_PUBLIC_ICE_PUBLIC_URL
    ? `${process.env.NEXT_PUBLIC_ICE_PUBLIC_URL.replace(/\/$/, '')}${streamUrl}`
    : streamUrl

  const copyUrl = () => {
    if (!streamUrl) return
    navigator.clipboard.writeText(streamUrl)
    setCopied(true)
    toast({ type: 'success', title: 'URL copiada al portapapeles' })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Streaming</h1>
        <p className="mt-1 text-sm text-gray-400">
          Gestioná tu radio en vivo: AutoDJ, playlists, biblioteca musical.
        </p>
      </div>

      <StreamControls isRunning={isRunning} onChange={refresh} />

      {streamUrl && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/40 shadow-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="text-sm font-semibold text-gray-300">URL de transmisión</span>
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={absoluteStreamUrl}
              className="flex-1 bg-gray-900 text-cyan-400 px-3 py-2.5 rounded-lg border border-gray-700 font-mono text-sm outline-none focus:ring-2 focus:ring-cyan-500/30"
              onClick={(e) => e.currentTarget.select()}
            />
            <a
              href={absoluteStreamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg text-center whitespace-nowrap transition-colors"
            >
              ▶ Escuchar
            </a>
            <button
              onClick={copyUrl}
              className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg whitespace-nowrap transition-colors"
            >
              {copied ? '✓ Copiado' : 'Copiar URL'}
            </button>
          </div>
          {isRunning && (
            <p className="text-xs text-green-400/80 mt-2.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Stream activo — compartí esta URL para que te escuchen
            </p>
          )}
        </div>
      )}

      <NowPlayingDisplay />

      <PlayHistory />
    </div>
  )
}
