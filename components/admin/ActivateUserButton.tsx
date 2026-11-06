'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { showToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface ActivateUserButtonProps {
  userId: string
  userName: string
  isActive: boolean
}

export function ActivateUserButton({ userId, userName, isActive }: ActivateUserButtonProps) {
  const { t } = useDashboardI18n()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/15 px-2 py-1 text-xs font-medium text-green-400">
        <CheckCircleIcon className="h-3.5 w-3.5" />
        {t('admin.usersList.active')}
      </span>
    )
  }

  const activate = async () => {
    if (!confirm(t('admin.usersList.activateConfirm', { name: userName }))) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/activate`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('admin.usersList.activateError'))
      if (data.activationEmail && !data.activationEmail.ok) {
        showToast({
          type: 'warning',
          title: t('admin.usersList.activated'),
          description: t('admin.usersList.activationEmailFailed'),
        })
      } else {
        showToast({ type: 'success', title: t('admin.usersList.activated') })
      }
      router.refresh()
    } catch (error) {
      showToast({
        type: 'error',
        title: error instanceof Error ? error.message : t('admin.usersList.activateError'),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void activate()}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
    >
      <CheckCircleIcon className="h-3.5 w-3.5" />
      {loading ? t('admin.usersList.activating') : t('admin.usersList.activate')}
    </button>
  )
}
