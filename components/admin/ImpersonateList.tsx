'use client'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import { ArrowPathRoundedSquareIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

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
  if (!name) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">Sin Plan</span>
  }
  const cls = name.toLowerCase().includes('pro')
    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
    : name.toLowerCase().includes('premium')
      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
  return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{name}</span>
}

export function ImpersonateList({ clients }: ImpersonateListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const handleImpersonate = async (clientId: string, clientName: string) => {
    if (!confirm(`¿Estás seguro de que quieres impersonar al cliente "${clientName}"?`)) {
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
        showToast({ type: 'error', title: error.error || 'Error al impersonar cliente' })
      }
    } catch (error) {
      showToast({ type: 'error', title: 'Error al impersonar cliente' })
    } finally {
      setLoading(null)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
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
        <div className="text-gray-500 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          No hay clientes
        </h3>
        <p className="text-gray-400">
          No hay clientes disponibles para impersonar
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
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o proyecto..."
                className="form-input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="text-sm text-gray-400">
            {filteredClients.length} de {clients.length} clientes
          </div>
        </div>
      </div>

      {/* Tabla de clientes */}
      <div className="bg-gray-800/80 rounded-xl border border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/60 text-gray-400 uppercase text-xs">
            <tr>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Usuario</th>
              <th className="text-left p-3">Plan</th>
              <th className="text-center p-3">Contenido</th>
              <th className="text-left p-3">Registrado</th>
              <th className="text-left p-3">Última actividad</th>
              <th className="text-right p-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client) => {
              const totalContent = client._count.programs + client._count.news +
                client._count.rankingVideos + client._count.sponsors + client._count.promotions

              return (
                <tr key={client.id} className="border-t border-gray-700/50 hover:bg-gray-700/20">
                  {/* Cliente con logo */}
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {client.basicData?.logoUrl ? (
                        <img
                          src={client.basicData.logoUrl}
                          alt={client.basicData.projectName}
                          className="w-9 h-9 object-contain rounded-lg bg-gray-700/30 p-0.5"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-white font-semibold text-sm">
                            {(client.basicData?.projectName || client.name).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-white font-medium whitespace-nowrap">
                        {client.basicData?.projectName || client.name}
                      </span>
                    </div>
                  </td>

                  <td className="p-3 text-gray-400 whitespace-nowrap">{client.user.email}</td>
                  <td className="p-3 text-gray-300 whitespace-nowrap">{client.user.name || '—'}</td>

                  <td className="p-3"><PlanBadge name={client.plan?.name} /></td>

                  {/* Contenido */}
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
                      <span title="Programas"><span className="font-medium text-blue-400">{client._count.programs}</span> Prog</span>
                      <span title="Noticias"><span className="font-medium text-green-400">{client._count.news}</span> News</span>
                      <span title="Videos"><span className="font-medium text-purple-400">{client._count.rankingVideos}</span> Vids</span>
                      <span title="Sponsors"><span className="font-medium text-yellow-400">{client._count.sponsors}</span> Spons</span>
                      <span title="Promociones"><span className="font-medium text-pink-400">{client._count.promotions}</span> Proms</span>
                    </div>
                    <div className="text-center text-[10px] text-gray-600 mt-0.5">{totalContent} total</div>
                  </td>

                  <td className="p-3 text-gray-400 whitespace-nowrap">{formatDate(client.user.createdAt)}</td>
                  <td className="p-3 text-gray-400 whitespace-nowrap">{formatDate(client.user.updatedAt)}</td>

                  {/* Acción */}
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleImpersonate(client.id, client.basicData?.projectName || client.name)}
                      disabled={loading === client.id}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs rounded-lg flex items-center gap-1.5 ml-auto"
                    >
                      {loading === client.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                          Impersonando...
                        </>
                      ) : (
                        <>
                          <ArrowPathRoundedSquareIcon className="h-4 w-4" />
                          Entrar
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
          <p className="text-gray-400">
            No se encontraron clientes que coincidan con "{searchTerm}"
          </p>
        </div>
      )}
    </div>
  )
}
