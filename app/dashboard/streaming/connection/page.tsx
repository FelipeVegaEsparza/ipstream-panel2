'use client'

import { useEffect, useState, useCallback } from 'react'
import { useStreamingStatus } from '@/lib/useStreamingStatus'

export default function ConnectionPage() {
  const { status } = useStreamingStatus({ pollingMs: 10000 })
  const [copyText, setCopyText] = useState<string | null>(null)

  const [connectionInfo, setConnectionInfo] = useState<{ host: string; port: number; mount: string } | null>(null)
  const [livePassword, setLivePassword] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [takeoverState, setTakeoverState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  useEffect(() => {
    fetch('/api/dashboard/streaming/connection')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.host) {
          setConnectionInfo(data)
        }
      })
      .catch(() => {})
  }, [])

  const icecastHost = connectionInfo?.host || (typeof window !== 'undefined' ? window.location.hostname : 'localhost')
  const icecastPort = connectionInfo?.port || 8000
  const mount = connectionInfo?.mount || status?.mount || 'mi-mount'

  const revealPassword = useCallback(async () => {
    if (livePassword) {
      setShowPassword(prev => !prev)
      return
    }
    setLoadingPassword(true)
    try {
      const res = await fetch('/api/dashboard/streaming/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revealPassword: 'live' }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLivePassword(data.password)
      setShowPassword(true)
    } catch {
      // silent fail
    } finally {
      setLoadingPassword(false)
    }
  }, [livePassword])

  const doTakeover = useCallback(async () => {
    setTakeoverState('loading')
    try {
      const res = await fetch('/api/dashboard/streaming/dj-takeover', { method: 'POST' })
      if (res.ok) {
        setTakeoverState('success')
        setTimeout(() => setTakeoverState('idle'), 5000)
      } else {
        setTakeoverState('error')
        setTimeout(() => setTakeoverState('idle'), 4000)
      }
    } catch {
      setTakeoverState('error')
      setTimeout(() => setTakeoverState('idle'), 4000)
    }
  }, [])

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopyText(label)
    setTimeout(() => setCopyText(null), 2000)
  }

  const displayPassword = showPassword && livePassword ? livePassword : '********'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Conexión DJ</h1>
        <p className="mt-1 text-sm text-gray-400">
          Datos para transmitir en vivo con BUTT, MIXXX u otro software DJ.
        </p>
      </div>

      <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 text-sm text-yellow-100 flex items-center justify-between gap-4 flex-wrap">
        <span>
          💡 <strong>DJ Takeover:</strong> Antes de conectar tu DJ, hacé clic en <strong>"Tomar control"</strong> para detener el AutoDJ. Cuando te desconectes, el AutoDJ volverá solo en ~30 segundos.
        </span>
        <button
          onClick={doTakeover}
          disabled={takeoverState === 'loading'}
          className={`shrink-0 px-4 py-2 rounded font-semibold text-sm whitespace-nowrap ${
            takeoverState === 'success'
              ? 'bg-green-600 text-white'
              : takeoverState === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50'
          }`}
        >
          {takeoverState === 'loading' ? 'Deteniendo...' : takeoverState === 'success' ? '✓ AutoDJ detenido' : takeoverState === 'error' ? 'Error, intentá de nuevo' : '🎤 Tomar control'}
        </button>
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
            <label className="text-xs text-gray-400 uppercase">Usuario</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-gray-900 text-cyan-400 px-3 py-2 rounded flex-1 font-mono text-sm">
                source
              </code>
              <button onClick={() => copy('source', 'Usuario')} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded">
                Copiar
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase">Password DJ</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-gray-900 text-cyan-400 px-3 py-2 rounded flex-1 font-mono text-sm">
                {displayPassword}
              </code>
              <button
                onClick={revealPassword}
                disabled={loadingPassword}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded"
                title={showPassword ? 'Ocultar password' : 'Mostrar password'}
              >
                {loadingPassword ? '...' : showPassword ? '🙈' : '👁'}
              </button>
              {livePassword && showPassword && (
                <button onClick={() => copy(livePassword, 'Password')} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded">
                  Copiar
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {livePassword
                ? 'Esta es tu clave para conectar como DJ. No la compartas.'
                : 'Hacé clic en 👁 para ver tu password DJ.'}
            </p>
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
          <li>Address: <code className="text-cyan-400">{icecastHost}</code></li>
          <li>Port: <code className="text-cyan-400">{icecastPort}</code></li>
          <li>Mount: <code className="text-cyan-400">/{mount}</code></li>
          <li>Username: <code className="text-cyan-400">source</code></li>
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
