'use client'

import type { ReferralDashboardData } from '@/lib/referrals/dashboard'

const CARDS: Array<{
  key: keyof ReferralDashboardData['summary']
  label: string
  hint: string
}> = [
  { key: 'totalReferred', label: 'Clientes referidos', hint: 'Total con tu enlace' },
  { key: 'valid', label: 'Referidos válidos', hint: 'Con dos pagos confirmados' },
  { key: 'pending', label: 'Pendientes', hint: 'En proceso de validación' },
  { key: 'monthsAccumulated', label: 'Meses acumulados', hint: 'Ganados en total' },
  { key: 'monthsAvailable', label: 'Meses disponibles', hint: 'Listos para aplicar' },
  { key: 'monthsUsed', label: 'Meses utilizados', hint: 'Ya aplicados' },
]

export function ReferralSummaryCards({ data }: { data: ReferralDashboardData }) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {CARDS.map((card) => (
        <div key={card.key} className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] text-muted-foreground">{card.label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {data.summary[card.key]}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground/80">{card.hint}</p>
        </div>
      ))}
    </section>
  )
}
