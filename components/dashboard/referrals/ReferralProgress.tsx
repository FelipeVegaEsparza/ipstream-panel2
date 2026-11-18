'use client'

import type { ReferralDashboardData } from '@/lib/referrals/dashboard'

export function ReferralProgress({ data }: { data: ReferralDashboardData }) {
  const { remainder, validCount, remainingToNext } = data.progress
  const percent = Math.min(100, (remainder / 2) * 100)

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-[13px] font-medium text-foreground">Progreso a tu próximo mes gratis</h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {validCount} de 2 referidos válidos en el ciclo actual.
      </p>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{remainder} / 2</span>
        <span>
          {remainingToNext === 1
            ? 'Falta un cliente nuevo para tu próximo mes gratis.'
            : 'Faltan dos clientes nuevos para tu próximo mes gratis.'}
        </span>
      </div>

      {data.summary.monthsAvailable > 0 && (
        <p className="mt-3 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-[11px] text-brand">
          Tienes {data.summary.monthsAvailable} mes(es) disponible(s). Se aplicarán automáticamente en
          tu próxima renovación.
        </p>
      )}
    </section>
  )
}
