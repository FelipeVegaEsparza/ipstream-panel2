'use client'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import { ArrowPathRoundedSquareIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Client {
  id: string
  name: string
  createdAt: Date
  user: {
    id: string
    name?: string | null
    email: string
    createdAt: Date
    updatedAt: Date
  }
  plan?: {
    id: string
    name: string
    price: number
    currency: string
  } | null
  basicData?: {
    projectName: string
    logoUrl?: string | null
  } | null
  _count: {
    programs: number
    news: number
    rankingVideos: number
    sponsors: number
    promotions: number
  }
}

interface ImpersonateListProps {
  clients: Client[]
}

function PlanBadge({ name }: { name?: string | null }) {
  const { t } = useDashboardI18n()
  if (!name) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{t('admin.impersonate.noPlan')}</span>
  }
  const cls = name.toLowerCase().includes('pro')
    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
    : name.toLowerCase().includes('premium')
      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
      : 'bg-brand/20 text-brand border border-brand/30'
  return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{name}</span>
}

export function ImpersonateList({ clients }: ImpersonateListProps) {
  const { locale, t } = useDashboardI18n()
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const handleImpersonate = async (clientId: string, clientName: string) => {
    if (!confirm(t('admin.impersonate.confirm', { name: clientName }))) {
      return
    }

    setLoading(clientId)
    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId }),
      })

      if (response.ok) {
        const data = await response.json()

        // Redirigir al dashboard - la cookie se establece automáticamente
        window.location.href = data.redirectUrl || '/dashboard'
      } else {
        const error = await response.json()
        showToast({ type: 'error', title: error.error || t('admin.impersonate.error') })
      }
    } catch (error) {
      showToast({ type: 'error', title: t('admin.impersonate.error') })
    } finally {
      setLoading(null)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date))
  }

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.basicData?.projectName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (clients.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          {t('admin.impersonate.empty')}
        </h3>
        <p className="text-muted-foreground">
          {t('admin.impersonate.emptyHint')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Buscador */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('admin.impersonate.searchPlaceholder')}
                className="form-input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {t('admin.impersonate.count', { filtered: filteredClients.length, total: clients.length })}
          </div>
        </div>
      </div>

      {/* Tabla de clientes */}
      <div className="bg-card/80 rounded-panel border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background/60 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="text-left p-3">{t('admin.impersonate.client')}</th>
              <th className="text-left p-3">{t('admin.impersonate.email')}</th>
              <th className="text-left p-3">{t('admin.impersonate.user')}</th>
              <th className="text-left p-3">{t('admin.impersonate.plan')}</th>
              <th className="text-center p-3">{t('admin.impersonate.content')}</th>
              <th className="text-left p-3">{t('admin.impersonate.registered')}</th>
              <th className="text-left p-3">{t('admin.impersonate.lastActivity')}</th>
              <th className="text-right p-3">{t('admin.impersonate.action')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client) => {
              const totalContent = client._count.programs + client._count.news +
                client._count.rankingVideos + client._count.sponsors + client._count.promotions

              return (
                <tr key={client.id} className="border-t border-border/50 hover:bg-secondary/20">
                  {/* Cliente con logo */}
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {client.basicData?.logoUrl ? (
                        <img
                          src={client.basicData.logoUrl}
                          alt={client.basicData.projectName}
                          className="w-9 h-9 object-contain rounded-lg bg-secondary/30 p-0.5"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-surface-3 from-brand to-brand rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-foreground font-semibold text-sm">
                            {(client.basicData?.projectName || client.name).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-foreground font-medium whitespace-nowrap">
                        {client.basicData?.projectName || client.name}
                      </span>
                    </div>
                  </td>

                  <td className="p-3 text-muted-foreground whitespace-nowrap">{client.user.email}</td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{client.user.name || '—'}</td>

                  <td className="p-3"><PlanBadge name={client.plan?.name} /></td>

                  {/* Contenido */}
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                      <span title={t('admin.impersonate.programs')}><span className="font-medium text-brand">{client._count.programs}</span> Prog</span>
                      <span title={t('admin.impersonate.news')}><span className="font-medium text-green-400">{client._count.news}</span> News</span>
                      <span title={t('admin.impersonate.videos')}><span className="font-medium text-purple-400">{client._count.rankingVideos}</span> Vids</span>
                      <span title={t('admin.impersonate.sponsors')}><span className="font-medium text-yellow-400">{client._count.sponsors}</span> Spons</span>
                      <span title={t('admin.impersonate.promotions')}><span className="font-medium text-pink-400">{client._count.promotions}</span> Proms</span>
                    </div>
                    <div className="text-center text-[10px] text-muted-foreground mt-0.5">{t('admin.impersonate.total', { count: totalContent })}</div>
                  </td>

                  <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(client.user.createdAt)}</td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(client.user.updatedAt)}</td>

                  {/* Acción */}
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleImpersonate(client.id, client.basicData?.projectName || client.name)}
                      disabled={loading === client.id}
                      className="px-3 py-1.5 bg-brand hover:bg-brand disabled:bg-secondary disabled:text-muted-foreground text-white text-xs rounded-lg flex items-center gap-1.5 ml-auto"
                    >
                      {loading === client.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                          {t('admin.impersonate.impersonating')}
                        </>
                      ) : (
                        <>
                          <ArrowPathRoundedSquareIcon className="h-4 w-4" />
                          {t('admin.impersonate.enter')}
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filteredClients.length === 0 && searchTerm && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {t('admin.impersonate.noMatches', { term: searchTerm })}
          </p>
        </div>
      )}
    </div>
  )
}
