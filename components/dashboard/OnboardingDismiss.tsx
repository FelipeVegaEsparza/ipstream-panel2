'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

export function OnboardingDismiss() {
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  const { t } = useDashboardI18n()

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await fetch('/api/dashboard/onboarding', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dismissed: true }),
          })
          router.refresh()
        } finally {
          setBusy(false)
        }
      }}
      className="text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
    >
      {t('dashboard.dismiss')}
    </button>
  )
}
