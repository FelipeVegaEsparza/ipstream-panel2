'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function OnboardingDismiss() {
  const [busy, setBusy] = useState(false)
  const router = useRouter()

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
      className="text-xs text-gray-500 hover:text-gray-300 disabled:opacity-50"
    >
      Ocultar
    </button>
  )
}
