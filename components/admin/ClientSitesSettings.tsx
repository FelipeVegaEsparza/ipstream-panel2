'use client'

import { useEffect, useState } from 'react'
import { showToast } from '@/components/ui/toast'

interface DnsResult {
  ok: boolean
  created?: boolean
  name?: string
  type?: string
  content?: string
  error?: string
}

export function ClientSitesSettings() {
  const [domain, setDomain] = useState('')
  const [target, setTarget] = useState('')
  const [ip, setIp] = useState('')
  const [token, setToken] = useState('')
  const [tokenSet, setTokenSet] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ensuring, setEnsuring] = useState(false)
  const [loadingCfg, setLoadingCfg] = useState(true)

  useEffect(() => {
    fetch('/api/admin/app-config')
      .then((r) => r.json())
      .then((d) => {
        setDomain(d.clientSitesDomain || '')
        setTarget(d.clientSitesTarget || '')
        setIp(d.clientSitesIp || '')
        setTokenSet(Boolean(d.cloudflareTokenSet))
      })
      .catch(() => showToast({ type: 'error', title: 'No se pudo cargar la configuración' }))
      .finally(() => setLoadingCfg(false))
  }, [])

  async function save() {
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        clientSitesDomain: domain,
        clientSitesTarget: target,
        clientSitesIp: ip,
      }
      if (token.trim()) body.cloudflareApiToken = token.trim()

      const res = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      setToken('')
      setTokenSet(Boolean(data.cloudflareTokenSet))
      showToast({ type: 'success', title: 'Configuración de sitios guardada' })
    } catch (e) {
      showToast({ type: 'error', title: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  async function ensureDns() {
    setEnsuring(true)
    try {
      const res = await fetch('/api/admin/client-sites/dns', { method: 'POST' })
      const data: DnsResult = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Error al asegurar el DNS')
      showToast({
        type: 'success',
        title: data.created
          ? `DNS base creado: ${data.name} ${data.type} → ${data.content}`
          : `DNS base ya existía: ${data.name} ${data.type} → ${data.content}`,
      })
    } catch (e) {
      showToast({ type: 'error', title: (e as Error).message })
    } finally {
      setEnsuring(false)
    }
  }

  const input =
    'w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-gray-600 focus:border-brand focus:outline-none'

  return (
    <div className="card max-w-2xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Sitios de clientes</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Dominios por los que se sirve el sitio (bundle único) de cada cliente. El
          wildcard DNS base hace que los subdominios resuelvan a la plataforma.
        </p>
      </div>

      {loadingCfg ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Dominio base de los sitios</label>
            <input className={input} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="ipstream.cl" />
            <p className="text-[11px] text-muted-foreground mt-1">Los clientes se sirven como <code>&lt;cliente&gt;.{domain || 'ipstream.cl'}</code>.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Target CNAME (dominios propios)</label>
              <input className={input} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="clientes.ipstream.cl" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">IP de la plataforma (wildcard A)</label>
              <input className={input} value={ip} onChange={(e) => setIp(e.target.value)} placeholder="1.2.3.4" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Token de Cloudflare (Zone:DNS:Edit)</label>
            <input
              type="password"
              className={input}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={tokenSet ? '•••••••• (ya configurado — deja vacío para conservarlo)' : 'cfat_…'}
              autoComplete="off"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={save}
              disabled={loading}
              className="rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand disabled:opacity-50"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={ensureDns}
              disabled={ensuring}
              className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-card disabled:opacity-50"
            >
              {ensuring ? 'Asegurando…' : 'Asegurar DNS base (wildcard)'}
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            &quot;Asegurar DNS base&quot; crea (idempotente) el registro <code>*.{domain || 'ipstream.cl'}</code>{' '}
            apuntando a la IP de la plataforma. Requiere el token de Cloudflare y la IP.
          </p>
        </>
      )}
    </div>
  )
}
