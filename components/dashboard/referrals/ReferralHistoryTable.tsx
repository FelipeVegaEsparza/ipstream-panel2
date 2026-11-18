'use client'

import type { ReferralDashboardReferral } from '@/lib/referrals/dashboard'

function statusClass(status: string): string {
  if (status === 'valid') return 'border-brand/30 bg-brand/10 text-brand'
  if (status === 'rejected') return 'border-danger/30 bg-danger/10 text-danger'
  return 'border-border bg-secondary text-muted-foreground'
}

export function ReferralHistoryTable({ referrals }: { referrals: ReferralDashboardReferral[] }) {
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-2.5">
        <h2 className="text-[13px] font-medium text-foreground">Historial de referidos</h2>
      </div>

      {referrals.length === 0 ? (
        <p className="px-4 py-8 text-center text-[12px] text-muted-foreground">
          Aún no tienes referidos. Comparte tu enlace para empezar.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Registro</th>
                <th className="px-4 py-2 font-medium">Plan</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Pagos</th>
                <th className="px-4 py-2 font-medium">Validación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {referrals.map((referral) => (
                <tr key={referral.id} className="text-[12px]">
                  <td className="px-4 py-2.5 text-foreground">
                    {referral.referredName}
                    {referral.flagged && (
                      <span className="ml-2 rounded-full border border-warn/30 bg-warn/10 px-1.5 py-0.5 text-[9px] text-warn">
                        En revisión
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatDate(referral.registeredAt)}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {referral.planName || 'Sin plan'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${statusClass(referral.status)}`}>
                      {referral.statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {referral.paymentProgress}/2
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {referral.validatedAt ? formatDate(referral.validatedAt) : '—'}
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
