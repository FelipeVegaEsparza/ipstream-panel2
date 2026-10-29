'use client'

import { useRouter } from 'next/navigation'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import Link from 'next/link'
import { PencilIcon, TrashIcon, EyeIcon, ArrowPathRoundedSquareIcon } from '@heroicons/react/24/outline'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

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
  const { locale, t } = useDashboardI18n()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const handleDelete = async (id: string, userName: string) => {
    if (!confirm(t('admin.usersList.deleteConfirm', { name: userName }))) {
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
        showToast({ type: 'error', title: error.error || t('admin.usersList.deleteError') })
      }
    } catch (error) {
      showToast({ type: 'error', title: t('admin.usersList.deleteError') })
    } finally {
      setLoading(null)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
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
        <div className="text-muted-foreground mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          {t('admin.usersList.empty')}
        </h3>
        <p className="text-muted-foreground mb-4">
          {t('admin.usersList.emptyHint')}
        </p>
        <Link href="/admin/users/new" className="btn-primary">
          {t('admin.usersList.createClient')}
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
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={t('admin.usersList.search')}
                className="form-input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {t('admin.usersList.count', { filtered: filteredUsers.length, total: users.length })}
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
            <div key={user.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-surface-3 from-brand to-brand rounded-full flex items-center justify-center">
                    <span className="text-foreground font-semibold text-lg">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info del usuario */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="text-lg font-semibold text-foreground">
                        {user.name || t('admin.usersList.noName')}
                      </h3>
                      <span className="px-2 py-1 text-xs rounded-full bg-brand/20 text-brand border border-brand/30">
                        {user.client?.plan?.name || 'basic'}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-1">{user.email}</p>
                    {user.client && (
                      <p className="text-muted-foreground text-sm">
                        {t('admin.usersList.project')} <span className="text-muted-foreground">{user.client.name}</span>
                      </p>
                    )}
                  </div>

                  {/* Estadísticas */}
                  <div className="hidden md:block text-right">
                    <div className="text-sm text-muted-foreground mb-1">
                      <span className="font-medium">{totalContent}</span> {t('admin.usersList.elements', { count: totalContent })}
                    </div>
                    <div className="text-xs text-muted-foreground space-x-2">
                      <span>{user.client?._count.programs || 0}P</span>
                      <span>{user.client?._count.news || 0}N</span>
                      <span>{user.client?._count.rankingVideos || 0}V</span>
                      <span>{user.client?._count.sponsors || 0}S</span>
                      <span>{user.client?._count.promotions || 0}Pr</span>
                    </div>
                  </div>

                  {/* Fechas */}
                  <div className="hidden lg:block text-right text-xs text-muted-foreground">
                    <div>{t('admin.usersList.created', { date: formatDate(user.createdAt) })}</div>
                    <div>{t('admin.usersList.updated', { date: formatDate(user.updatedAt) })}</div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center space-x-2 ml-4">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="p-2 text-muted-foreground hover:text-brand transition-colors"
                    title={t('admin.usersList.viewDetails')}
                  >
                    <EyeIcon className="h-5 w-5" />
                  </Link>
                  <Link
                    href={`/admin/impersonate?userId=${user.id}`}
                    className="p-2 text-muted-foreground hover:text-purple-400 transition-colors"
                    title={t('admin.usersList.impersonate')}
                  >
                    <ArrowPathRoundedSquareIcon className="h-5 w-5" />
                  </Link>
                  <Link
                    href={`/admin/users/${user.id}/edit`}
                    className="p-2 text-muted-foreground hover:text-brand transition-colors"
                    title={t('admin.usersList.editUser')}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => handleDelete(user.id, user.name || user.email)}
                    disabled={loading === user.id}
                    className="p-2 text-muted-foreground hover:text-red-400 disabled:opacity-50 transition-colors"
                    title={t('admin.usersList.deleteUser')}
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
          <p className="text-muted-foreground">
            {t('admin.usersList.noMatches', { term: searchTerm })}
          </p>
        </div>
      )}
    </div>
  )
}