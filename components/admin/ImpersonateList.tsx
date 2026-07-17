'use client'

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
        alert(error.error || 'Error al impersonar cliente')
      }
    } catch (error) {
      alert('Error al impersonar cliente')
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

      {/* Lista de clientes */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredClients.map((client) => {
          const totalContent = client._count.programs + client._count.news + 
            client._count.rankingVideos + client._count.sponsors + client._count.promotions

          return (
            <div key={client.id} className="card hover:scale-[1.02] transition-all duration-200 group">
              <div className="space-y-4">
                {/* Header con logo/avatar */}
                <div className="flex items-center space-x-3">
                  {client.basicData?.logoUrl ? (
                    <img
                      src={client.basicData.logoUrl}
                      alt={client.basicData.projectName}
                      className="w-12 h-12 object-contain rounded-lg bg-gray-700/30 p-1"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {(client.basicData?.projectName || client.name).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">
                      {client.basicData?.projectName || client.name}
                    </h3>
                    <p className="text-sm text-gray-400">{client.user.email}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    client.plan?.name.toLowerCase().includes('pro') ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                    client.plan?.name.toLowerCase().includes('premium') ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {client.plan?.name || 'Sin Plan'}
                  </span>
                </div>

                {/* Información del usuario */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Usuario:</span>
                    <span className="text-gray-300">{client.user.name || 'Sin nombre'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Registrado:</span>
                    <span className="text-gray-300">{formatDate(client.user.createdAt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Última actividad:</span>
                    <span className="text-gray-300">{formatDate(client.user.updatedAt)}</span>
                  </div>
                </div>

                {/* Estadísticas de contenido */}
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Contenido total:</span>
                    <span className="text-sm font-medium text-white">{totalContent} elementos</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-xs text-gray-500">
                    <div className="text-center">
                      <div className="font-medium text-blue-400">{client._count.programs}</div>
                      <div>Prog</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-green-400">{client._count.news}</div>
                      <div>News</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-purple-400">{client._count.rankingVideos}</div>
                      <div>Vids</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-yellow-400">{client._count.sponsors}</div>
                      <div>Spons</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-pink-400">{client._count.promotions}</div>
                      <div>Proms</div>
                    </div>
                  </div>
                </div>

                {/* Botón de impersonación */}
                <button
                  onClick={() => handleImpersonate(client.id, client.basicData?.projectName || client.name)}
                  disabled={loading === client.id}
                  className="w-full btn-primary disabled:opacity-50 flex items-center justify-center gap-2 group-hover:scale-105 transition-transform"
                >
                  {loading === client.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Impersonando...
                    </>
                  ) : (
                    <>
                      <ArrowPathRoundedSquareIcon className="h-5 w-5" />
                      Entrar como Cliente
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
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