'use client'

import { useRouter } from 'next/navigation'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import Link from 'next/link'
import { PencilIcon, TrashIcon, EyeIcon, ArrowPathRoundedSquareIcon } from '@heroicons/react/24/outline'

interface User {
  id: string
  name?: string | null
  email: string
  createdAt: Date
  updatedAt: Date
  client?: {
    id: string
    name: string
    plan?: { name: string } | null
    phone?: string | null
    createdAt: Date
    _count: {
      programs: number
      news: number
      rankingVideos: number
      sponsors: number
      promotions: number
    }
  } | null
}

interface UsersListProps {
  users: User[]
}

export function UsersList({ users }: UsersListProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const handleDelete = async (id: string, userName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar al usuario "${userName}"? Esta acción no se puede deshacer.`)) {
      return
    }

    setLoading(id)
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.refresh()
      } else {
        const error = await response.json()
        showToast({ type: 'error', title: error.error || 'Error al eliminar el usuario' })
      }
    } catch (error) {
      showToast({ type: 'error', title: 'Error al eliminar el usuario' })
    } finally {
      setLoading(null)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          No hay usuarios
        </h3>
        <p className="text-gray-400 mb-4">
          Comienza creando tu primer cliente
        </p>
        <Link href="/admin/users/new" className="btn-primary">
          Crear Cliente
        </Link>
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
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
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
            {filteredUsers.length} de {users.length} usuarios
          </div>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className="grid gap-6">
        {filteredUsers.map((user) => {
          const totalContent = user.client?._count ? 
            user.client._count.programs + user.client._count.news + user.client._count.rankingVideos + 
            user.client._count.sponsors + user.client._count.promotions : 0

          return (
            <div key={user.id} className="card hover:scale-[1.01] transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info del usuario */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="text-lg font-semibold text-white">
                        {user.name || 'Sin nombre'}
                      </h3>
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {user.client?.plan?.name || 'basic'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-1">{user.email}</p>
                    {user.client && (
                      <p className="text-gray-500 text-sm">
                        Proyecto: <span className="text-gray-300">{user.client.name}</span>
                      </p>
                    )}
                  </div>

                  {/* Estadísticas */}
                  <div className="hidden md:block text-right">
                    <div className="text-sm text-gray-300 mb-1">
                      <span className="font-medium">{totalContent}</span> elementos
                    </div>
                    <div className="text-xs text-gray-500 space-x-2">
                      <span>{user.client?._count.programs || 0}P</span>
                      <span>{user.client?._count.news || 0}N</span>
                      <span>{user.client?._count.rankingVideos || 0}V</span>
                      <span>{user.client?._count.sponsors || 0}S</span>
                      <span>{user.client?._count.promotions || 0}Pr</span>
                    </div>
                  </div>

                  {/* Fechas */}
                  <div className="hidden lg:block text-right text-xs text-gray-500">
                    <div>Creado: {formatDate(user.createdAt)}</div>
                    <div>Actualizado: {formatDate(user.updatedAt)}</div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center space-x-2 ml-4">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                    title="Ver detalles"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </Link>
                  <Link
                    href={`/admin/impersonate?userId=${user.id}`}
                    className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
                    title="Impersonar usuario"
                  >
                    <ArrowPathRoundedSquareIcon className="h-5 w-5" />
                  </Link>
                  <Link
                    href={`/admin/users/${user.id}/edit`}
                    className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                    title="Editar usuario"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => handleDelete(user.id, user.name || user.email)}
                    disabled={loading === user.id}
                    className="p-2 text-gray-400 hover:text-red-400 disabled:opacity-50 transition-colors"
                    title="Eliminar usuario"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredUsers.length === 0 && searchTerm && (
        <div className="text-center py-8">
          <p className="text-gray-400">
            No se encontraron usuarios que coincidan con "{searchTerm}"
          </p>
        </div>
      )}
    </div>
  )
}