'use client'

// =====================================================
// StreamControls — start / stop / restart
// =====================================================

import { useState } from 'react'
import { useToast } from '@/components/ui/toast'

interface Props {
  isRunning: boolean
  onChange: () => void  // refresca el status
}

export function StreamControls({ isRunning, onChange }: Props) {
  const { toast } = useToast()
  const [busy, setBusy] = useState<'start' | 'stop' | 'restart' | null>(null)

  async function call(action: 'start' | 'stop' | 'restart') {
    setBusy(action)
    try {
      const res = await fetch('/api/dashboard/streaming/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'Error')
      toast({ type: 'success', title: `Stream ${action === 'start' ? 'iniciado' : action === 'stop' ? 'detenido' : 'reiniciado'}` })
      onChange()
    } catch (err: any) {
      console.error(err)
      toast({ type: 'error', title: 'Error', description: err.message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Controles</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => call('start')}
          disabled={isRunning || busy !== null}
          className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
        >
          {busy === 'start' ? '⏳' : '▶'} Iniciar AutoDJ
        </button>
        <button
          onClick={() => call('stop')}
          disabled={!isRunning || busy !== null}
          className="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
        >
          {busy === 'stop' ? '⏳' : '⏹'} Detener
        </button>
        <button
          onClick={() => call('restart')}
          disabled={busy !== null}
          className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
        >
          {busy === 'restart' ? '⏳' : '↻'} Reiniciar
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Detener deja la radio en silencio. Reiniciar recarga la playlist activa. Iniciar arranca el AutoDJ.
      </p>
    </div>
  )
}
