'use client'

import { formatCurrency } from '@/lib/billing-format'
import type { ReferralDashboardReward } from '@/lib/referrals/dashboard'

function statusClass(status: string): string {
  if (status === 'available') return 'border-brand/30 bg-brand/10 text-brand'
  if (status === 'voided') return 'border-danger/30 bg-danger/10 text-danger'
  return 'border-border bg-secondary text-muted-foreground'
}

export function ReferralRewardsTable({ rewards }: { rewards: ReferralDashboardReward[] }) {
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-2.5">
        <h2 className="text-[13px] font-medium text-foreground">Historial de recompensas</h2>
      </div>

      {rewards.length === 0 ? (
        <p className="px-4 py-8 text-center text-[12px] text-muted-foreground">
          Todavía no has generado recompensas. Cada dos referidos válidos ganas un mes gratis.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 font-medium">Fecha</th>
                <th className="px-4 py-2 font-medium">Meses</th>
                <th className="px-4 py-2 font-medium">Valor</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Aplicado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rewards.map((reward) => (
                <tr key={reward.id} className="text-[12px]">
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatDate(reward.generatedAt)}
                  </td>
                  <td className="px-4 py-2.5 text-foreground">{reward.months}</td>
                  <td className="px-4 py-2.5 text-foreground">
                    {formatCurrency(reward.amount, reward.currency)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${statusClass(reward.status)}`}>
                      {reward.statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {reward.appliedAt ? formatDate(reward.appliedAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
