'use client'

import { useCallback, useEffect, useState } from 'react'

interface ClientDomain {
  id: string
  hostname: string
  kind: 'subdomain' | 'custom'
  status: 'pending' | 'active' | 'error'
  isPrimary: boolean
  verifyToken: string | null
}

interface DomainManagerProps {
  userId: string
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-500/15 text-green-400 border-green-500/30',
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  error: 'bg-red-500/15 text-red-400 border-red-500/30',
}

export function DomainManager({ userId }: DomainManagerProps) {
  const [domains, setDomains] = useState<ClientDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hostname, setHostname] = useState('')
  const [kind, setKind] = useState<'subdomain' | 'custom'>('subdomain')
  const [isPrimary, setIsPrimary] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/domains`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar dominios')
      setDomains(data.domains || [])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  async function addDomain(e: React.FormEvent) {
    e.preventDefault()
    if (!hostname.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: hostname.trim(), kind, isPrimary }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear el dominio')
      setHostname('')
      setIsPrimary(false)
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function patch(domainId: string, body: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/domains/${domainId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al actualizar el dominio')
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(domainId: string) {
    if (!confirm('¿Eliminar este dominio?')) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/domains/${domainId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar el dominio')
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card max-w-2xl">
      <h2 className="text-xl font-semibold text-white mb-1">Dominios del sitio</h2>
      <p className="text-sm text-gray-400 mb-4">
        Dominios por los que se sirve el sitio del cliente (bundle único). El
        subdominio de plataforma puede abreviarse (p. ej. <code>radio-x</code>).
      </p>

      {error && (
        <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando dominios…</p>
      ) : domains.length === 0 ? (
        <p className="text-gray-400 text-sm">Sin dominios registrados.</p>
      ) : (
        <ul className="divide-y divide-gray-800 mb-4">
          {domains.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white truncate">{d.hostname}</span>
                  {d.isPrimary && (
                    <span className="text-[10px] uppercase tracking-wide rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5">
                      Primario
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <span className={`rounded border px-1.5 py-0.5 ${STATUS_STYLES[d.status] || STATUS_STYLES.pending}`}>
                    {d.status}
                  </span>
                  <span>{d.kind}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!d.isPrimary && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => patch(d.id, { isPrimary: true })}
                    className="text-xs rounded border border-gray-700 px-2 py-1 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                  >
                    Hacer primario
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => patch(d.id, { status: d.status === 'active' ? 'pending' : 'active' })}
                  className="text-xs rounded border border-gray-700 px-2 py-1 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                >
                  {d.status === 'active' ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(d.id)}
                  className="text-xs rounded border border-red-500/40 px-2 py-1 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addDomain} className="flex flex-wrap items-end gap-3 border-t border-gray-800 pt-4">
        <div className="flex-1 min-w-[12rem]">
          <label htmlFor="domain-hostname" className="block text-xs text-gray-400 mb-1">
            Dominio
          </label>
          <input
            id="domain-hostname"
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            placeholder={kind === 'subdomain' ? 'radio-x' : 'radio.cliente.com'}
            className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="domain-kind" className="block text-xs text-gray-400 mb-1">
            Tipo
          </label>
          <select
            id="domain-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as 'subdomain' | 'custom')}
            className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="subdomain">Subdominio</option>
            <option value="custom">Dominio propio</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-300 pb-2">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="rounded border-gray-700 bg-gray-900"
          />
          Primario
        </label>
        <button
          type="submit"
          disabled={busy || !hostname.trim()}
          className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          Agregar
        </button>
      </form>
    </div>
  )
}
