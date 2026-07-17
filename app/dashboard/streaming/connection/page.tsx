'use client'

// =====================================================
// Page — /dashboard/streaming/connection
// =====================================================
// Datos para que un DJ se conecte a la radio con BUTT / MIXXX / etc.

import { useEffect, useState } from 'react'
import { useStreamingStatus } from '@/lib/useStreamingStatus'

interface IcecastInfo {
  listenurl?: string
  server_name?: string
  server_description?: string
  bitrate?: number
  stream_start?: string
}

export default function ConnectionPage() {
  const { status } = useStreamingStatus({ pollingMs: 10000 })
  const [copyText, setCopyText] = useState<string | null>(null)

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopyText(label)
    setTimeout(() => setCopyText(null), 2000)
  }

  // Datos de conexión (en prod vendrían de config del cliente)
  const icecastHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const icecastPort = 8000
  const mount = status?.mount || 'mi-mount'
  const sourcePassword = '****'  // Nunca se muestra el password real
  const livePassword = '****'     // Se obtiene al activar la radio

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Conexión DJ</h1>
        <p className="mt-1 text-sm text-gray-400">
          Datos para transmitir en vivo con BUTT, MIXXX u otro software DJ.
        </p>
      </div>

      <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 text-sm text-yellow-100">
        💡 <strong>Tip:</strong> Tu AutoDJ se está ejecutando con prioridad baja.
        Cuando conectes un DJ, este tomará el control automáticamente.
        Al desconectarse, vuelve a sonar el AutoDJ.
      </div>

      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Configuración de transmisión</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 uppercase">Servidor</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-gray-900 text-cyan-400 px-3 py-2 rounded flex-1 font-mono text-sm">
                {icecastHost}
              </code>
              <button onClick={() => copy(icecastHost, 'Servidor')} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded">
                Copiar
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase">Puerto</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-gray-900 text-cyan-400 px-3 py-2 rounded flex-1 font-mono text-sm">
                {icecastPort}
              </code>
              <button onClick={() => copy(String(icecastPort), 'Puerto')} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded">
                Copiar
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase">Mountpoint</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-gray-900 text-cyan-400 px-3 py-2 rounded flex-1 font-mono text-sm">
                /{mount}
              </code>
              <button onClick={() => copy(`/${mount}`, 'Mount')} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded">
                Copiar
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase">Password DJ</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-gray-900 text-gray-500 px-3 py-2 rounded flex-1 font-mono text-sm">
                {livePassword}
              </code>
              <span className="text-xs text-gray-500">(ver config del servidor)</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Pedile tu password DJ al administrador.</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Software recomendado</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900/50 p-4 rounded">
            <div className="font-semibold text-white">BUTT</div>
            <p className="text-sm text-gray-400 mt-1">Simple, liviano, perfecto para empezar.</p>
            <a href="https://danielnoethen.de/butt/" target="_blank" rel="noopener" className="text-xs text-cyan-400 hover:text-cyan-300 mt-2 inline-block">Descargar →</a>
          </div>
          <div className="bg-gray-900/50 p-4 rounded">
            <div className="font-semibold text-white">MIXXX</div>
            <p className="text-sm text-gray-400 mt-1">Profesional, con mezclas y efectos.</p>
            <a href="https://mixxx.org/" target="_blank" rel="noopener" className="text-xs text-cyan-400 hover:text-cyan-300 mt-2 inline-block">Descargar →</a>
          </div>
          <div className="bg-gray-900/50 p-4 rounded">
            <div className="font-semibold text-white">Altacast</div>
            <p className="text-sm text-gray-400 mt-1">Otra opción simple y multiplataforma.</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold text-white">Configuración en BUTT (ejemplo)</h2>
        <ol className="text-sm text-gray-300 space-y-2 list-decimal pl-5">
          <li>Abrí BUTT → Settings → Stream</li>
          <li>Server type: <code className="text-cyan-400">Icecast 2</code></li>
          <li>Server address: <code className="text-cyan-400">{icecastHost}</code></li>
          <li>Port: <code className="text-cyan-400">{icecastPort}</code></li>
          <li>Mountpoint: <code className="text-cyan-400">/{mount}</code></li>
          <li>Password: tu password DJ</li>
          <li>Stream name: tu nombre artístico</li>
          <li>Click <strong>Add</strong> y luego <strong>Play</strong></li>
        </ol>
      </div>

      {copyText && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg">
          ✓ {copyText} copiado
        </div>
      )}
    </div>
  )
}
