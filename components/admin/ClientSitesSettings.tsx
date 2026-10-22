'use client'

import { useEffect, useState } from 'react'
import { showToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface DnsResult {
  ok: boolean
  created?: boolean
  name?: string
  type?: string
  content?: string
  error?: string
}

export function ClientSitesSettings() {
  const { t } = useDashboardI18n()
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
      .catch(() => showToast({ type: 'error', title: t('admin.clientSites.loadError') }))
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
      if (!res.ok) throw new Error(data.error || t('admin.clientSites.saveError'))
      setToken('')
      setTokenSet(Boolean(data.cloudflareTokenSet))
      showToast({ type: 'success', title: t('admin.clientSites.saved') })
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
      if (!res.ok || !data.ok) throw new Error(data.error || t('admin.clientSites.ensureError'))
      showToast({
        type: 'success',
        title: data.created
          ? t('admin.clientSites.dnsCreated', { name: data.name, type: data.type, content: data.content })
          : t('admin.clientSites.dnsExisting', { name: data.name, type: data.type, content: data.content }),
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
        <h2 className="text-xl font-semibold text-foreground">{t('admin.clientSites.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('admin.clientSites.subtitle')}
        </p>
      </div>

      {loadingCfg ? (
        <p className="text-sm text-muted-foreground">{t('admin.clientSites.loading')}</p>
      ) : (
        <>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t('admin.clientSites.baseDomain')}</label>
            <input className={input} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="casterfly.com" />
            <p className="text-[11px] text-muted-foreground mt-1">{t('admin.clientSites.baseDomainHint', { domain: domain || 'casterfly.com' })}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('admin.clientSites.cnameTarget')}</label>
              <input className={input} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="clientes.casterfly.com" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('admin.clientSites.ip')}</label>
              <input className={input} value={ip} onChange={(e) => setIp(e.target.value)} placeholder="1.2.3.4" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t('admin.clientSites.token')}</label>
            <input
              type="password"
              className={input}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={tokenSet ? t('admin.clientSites.tokenPlaceholder') : 'cfat_…'}
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
              {t('admin.clientSites.save')}
            </button>
            <button
              type="button"
              onClick={ensureDns}
              disabled={ensuring}
              className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-card disabled:opacity-50"
            >
              {ensuring ? t('admin.clientSites.ensuring') : t('admin.clientSites.ensureDns')}
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {t('admin.clientSites.ensureHint1')} <code>*.{domain || 'casterfly.com'}</code>{' '}
            {t('admin.clientSites.ensureHint2')}
          </p>
        </>
      )}
    </div>
  )
}
