'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, X } from 'lucide-react'

interface DownServer {
  server: { id: string; name: string; isActive: boolean }
  affectedClients: number
}

const POLL_MS = 30000

export function ServerAlerts() {
  const [down, setDown] = useState<DownServer[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let active = true
    const check = async () => {
      try {
        const res = await fetch('/api/admin/servers/health')
        if (res.ok) {
          const data = await res.json()
          if (active) {
            setDown(data.down || [])
            setDismissed(false)
          }
        }
      } catch {
        // silencioso
      }
    }
    check()
    const id = setInterval(check, POLL_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  if (down.length === 0 || dismissed) return null

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-8 pt-4">
      <div className="flex items-start justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-300">
              {down.length === 1 ? '1 servidor de streaming sin respuesta' : `${down.length} servidores de streaming sin respuesta`}
            </p>
            <ul className="mt-1 text-xs text-red-200/90 space-y-0.5">
              {down.map((d) => (
                <li key={d.server.id}>
                  {d.server.name} — {d.affectedClients} cliente{d.affectedClients === 1 ? '' : 's'} afectado{d.affectedClients === 1 ? '' : 's'}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-red-200/70">
              El panel no migra clientes automáticamente. Revisá{' '}
              <Link href="/admin/servers" className="underline underline-offset-2 hover:text-white">
                Servidores de Streaming
              </Link>{' '}
              para migrarlos manualmente.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-red-300 hover:text-white shrink-0"
          aria-label="Cerrar alerta"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
