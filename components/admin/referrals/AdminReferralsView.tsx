'use client'

import { Fragment, useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatDate } from '@/lib/billing-format'
import type { getAdminReferralData } from '@/lib/referrals/admin'

type AdminData = Awaited<ReturnType<typeof getAdminReferralData>>

const STATUS_LABELS: Record<string, string> = {
  registered: 'Registrado',
  pending_contract: 'Pendiente de contratación',
  pending_first_payment: 'Pendiente de primer pago',
  first_payment_confirmed: 'Primer pago confirmado',
  pending_second_payment: 'Pendiente de segundo pago',
  valid: 'Válido',
  rejected: 'Rechazado',
}

const REWARD_LABELS: Record<string, string> = {
  available: 'Disponible',
  applied: 'Aplicado',
  expired: 'Vencido',
  voided: 'Anulado',
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'valid'
      ? 'border-brand/30 bg-brand/10 text-brand'
      : status === 'rejected'
        ? 'border-danger/30 bg-danger/10 text-danger'
        : 'border-border bg-secondary text-muted-foreground'
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${cls}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export function AdminReferralsView({ data }: { data: AdminData }) {
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const inRange = (value: string | Date) => {
    const time = new Date(value).getTime()
    if (from && time < new Date(from).getTime()) return false
    if (to && time > new Date(`${to}T23:59:59`).getTime()) return false
    return true
  }

  const match = (...values: Array<string | null | undefined>) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return values.some((value) => (value || '').toLowerCase().includes(q))
  }

  const referrals = useMemo(
    () =>
      data.referrals.filter((referral) => {
        if (!inRange(referral.registeredAt)) return false
        if (status === 'pending' && (referral.status === 'valid' || referral.status === 'rejected')) {
          return false
        }
        if (status !== 'all' && status !== 'pending' && referral.status !== status) return false
        return match(
          referral.code,
          referral.referrer?.name,
          referral.referrer?.user?.email,
          referral.referred?.name,
          referral.referred?.user?.email
        )
      }),
    [data.referrals, query, from, to, status]
  )

  const referrers = useMemo(
    () =>
      data.referrers.filter((referrer) =>
        match(referrer.name, referrer.email, referrer.code)
      ),
    [data.referrers, query]
  )

  const rewards = useMemo(
    () =>
      data.rewards.filter((reward) =>
        match(
          reward.referrer?.name,
          reward.referrer?.user?.email,
          reward.referralCode,
          reward.referredName
        )
      ),
    [data.rewards, query]
  )

  const audit = useMemo(
    () =>
      data.audit.filter((entry) => {
        if (!inRange(entry.createdAt)) return false
        return match(entry.action, entry.reason)
      }),
    [data.audit, query, from, to]
  )

  async function action(url: string, body: Record<string, unknown>, method = 'POST') {
    setBusy(true)
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        window.alert(payload?.error || 'No se pudo completar la operación')
        return
      }
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  function rejectReferral(id: string) {
    const reason = window.prompt('Motivo del rechazo (obligatorio):')
    if (reason === null) return
    if (!reason.trim()) {
      window.alert('Debes indicar un motivo.')
      return
    }
    action(`/api/admin/referrals/${id}/flag`, { action: 'reject', reason })
  }

  function approveReferral(id: string) {
    const reason = window.prompt('Motivo / nota de aprobación (opcional):') || ''
    action(`/api/admin/referrals/${id}/flag`, { action: 'approve', reason })
  }

  function voidRewardAction(id: string) {
    const reason = window.prompt('Motivo de la anulación (obligatorio):')
    if (reason === null) return
    if (!reason.trim()) {
      window.alert('Debes indicar un motivo.')
      return
    }
    action(`/api/admin/referral-rewards/${id}/void`, { reason })
  }

  function refundPayment(id: string) {
    const reason = window.prompt('Motivo del reembolso / contracargo:') || ''
    if (!window.confirm('¿Marcar este pago como reembolsado y revisar el referido?')) return
    action(`/api/admin/payments/${id}/refund`, { reason })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Programa de Referidos</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Gestiona referentes, validaciones, recompensas y auditoría del programa.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3">
        <label className="flex-1 min-w-[220px]">
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
            Buscar
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cliente, email o código"
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] text-foreground outline-none focus:border-brand"
          />
        </label>
        <label>
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
            Desde
          </span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] text-foreground outline-none focus:border-brand"
          />
        </label>
        <label>
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
            Hasta
          </span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] text-foreground outline-none focus:border-brand"
          />
        </label>
        <label>
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
            Estado
          </span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] text-foreground outline-none focus:border-brand"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="valid">Válidos</option>
            <option value="rejected">Rechazados</option>
          </select>
        </label>
      </div>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-card">
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="referrers">Referentes</TabsTrigger>
          <TabsTrigger value="referrals">Referidos</TabsTrigger>
          <TabsTrigger value="rewards">Recompensas</TabsTrigger>
          <TabsTrigger value="review">Revisión ({data.review.length})</TabsTrigger>
          <TabsTrigger value="audit">Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {[
              ['Clientes captados', data.kpis.totalReferred],
              ['Referidos pendientes', data.kpis.pending],
              ['Referidos válidos', data.kpis.valid],
              ['Meses gratuitos generados', data.kpis.monthsGenerated],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
              </div>
            ))}
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] text-muted-foreground">Crédito otorgado</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {data.kpis.creditGranted.length
                  ? data.kpis.creditGranted
                      .map((row) => formatCurrency(row.amount, row.currency))
                      .join(' · ')
                  : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] text-muted-foreground">Crédito utilizado</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {data.kpis.creditUsed.length
                  ? data.kpis.creditUsed
                      .map((row) => formatCurrency(row.amount, row.currency))
                      .join(' · ')
                  : '—'}
              </p>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="referrers">
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Cliente</th>
                    <th className="px-4 py-2 font-medium">Código</th>
                    <th className="px-4 py-2 font-medium">Referidos</th>
                    <th className="px-4 py-2 font-medium">Válidos</th>
                    <th className="px-4 py-2 font-medium">Pendientes</th>
                    <th className="px-4 py-2 font-medium">Meses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {referrers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                        Sin clientes referentes para el filtro.
                      </td>
                    </tr>
                  ) : (
                    referrers.map((referrer) => (
                      <tr key={referrer.id} className="text-[12px]">
                        <td className="px-4 py-2.5 text-foreground">
                          {referrer.name}
                          {referrer.email && (
                            <span className="block text-[10px] text-muted-foreground">
                              {referrer.email}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                          {referrer.code}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{referrer.total}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{referrer.valid}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{referrer.pending}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{referrer.rewards}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="referrals">
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Referente</th>
                    <th className="px-4 py-2 font-medium">Referido</th>
                    <th className="px-4 py-2 font-medium">Código</th>
                    <th className="px-4 py-2 font-medium">Registro</th>
                    <th className="px-4 py-2 font-medium">Estado</th>
                    <th className="px-4 py-2 font-medium">Pagos</th>
                    <th className="px-4 py-2 font-medium">Validación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {referrals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                        Sin referidos para el filtro.
                      </td>
                    </tr>
                  ) : (
                    referrals.map((referral) => (
                      <Fragment key={referral.id}>
                        <tr
                          className="cursor-pointer text-[12px] hover:bg-secondary/60"
                          onClick={() =>
                            setExpanded(expanded === referral.id ? null : referral.id)
                          }
                        >
                          <td className="px-4 py-2.5 text-foreground">
                            {referral.referrer?.name}
                            <span className="block text-[10px] text-muted-foreground">
                              {referral.referrer?.user?.email}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-foreground">
                            {referral.referred?.name}
                            <span className="block text-[10px] text-muted-foreground">
                              {referral.referred?.user?.email} · {referral.referred?.plan?.name || 'Sin plan'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                            {referral.code}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {formatDate(referral.registeredAt)}
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={referral.status} />
                            {referral.flagged && (
                              <span className="ml-1 text-[10px] text-warn">revisión</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {referral.payments.length}/2
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {referral.validatedAt ? formatDate(referral.validatedAt) : '—'}
                          </td>
                        </tr>
                        {expanded === referral.id && (
                          <tr className="bg-background/50">
                            <td colSpan={7} className="px-4 py-3">
                              <p className="mb-2 text-[11px] font-medium text-foreground">
                                Pagos de validación
                              </p>
                              {referral.payments.length === 0 ? (
                                <p className="text-[11px] text-muted-foreground">
                                  Sin pagos de validación registrados.
                                </p>
                              ) : (
                                <div className="space-y-1.5">
                                  {referral.payments.map((payment, index) => (
                                    <div
                                      key={`${referral.id}-pay-${index}`}
                                      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px]"
                                    >
                                      <span className="font-medium text-foreground">
                                        {payment.role === 'first' ? 'Primer pago' : 'Segundo pago'}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {payment.amount != null
                                          ? formatCurrency(payment.amount, payment.currency || 'CLP')
                                          : '—'}
                                      </span>
                                      <span className="text-muted-foreground">{payment.status}</span>
                                      <span className="text-muted-foreground">
                                        {payment.paidAt ? formatDate(payment.paidAt) : '—'}
                                      </span>
                                      <span className="font-mono text-[10px] text-muted-foreground/80">
                                        {payment.transactionId || '—'}
                                      </span>
                                      {payment.status === 'completed' && (
                                        <button
                                          type="button"
                                          disabled={busy}
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            if (payment.id) refundPayment(payment.id)
                                          }}
                                          className="ml-auto text-[10px] text-danger hover:underline disabled:opacity-50"
                                        >
                                          Marcar reembolso
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <p className="mb-2 mt-3 text-[11px] font-medium text-foreground">
                                Recompensas asociadas
                              </p>
                              {referral.rewards.length === 0 ? (
                                <p className="text-[11px] text-muted-foreground">Sin recompensas.</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {referral.rewards.map((reward) => (
                                    <span
                                      key={reward.id}
                                      className="rounded-lg border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground"
                                    >
                                      {REWARD_LABELS[reward.status] || reward.status} ·{' '}
                                      {formatCurrency(reward.amount, reward.currency)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="rewards">
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Beneficiario</th>
                    <th className="px-4 py-2 font-medium">Referido</th>
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-4 py-2 font-medium">Meses</th>
                    <th className="px-4 py-2 font-medium">Valor</th>
                    <th className="px-4 py-2 font-medium">Estado</th>
                    <th className="px-4 py-2 font-medium">Aplicado</th>
                    <th className="px-4 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rewards.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                        Sin recompensas para el filtro.
                      </td>
                    </tr>
                  ) : (
                    rewards.map((reward) => (
                      <tr key={reward.id} className="text-[12px]">
                        <td className="px-4 py-2.5 text-foreground">
                          {reward.referrer?.name}
                          <span className="block text-[10px] text-muted-foreground">
                            {reward.referrer?.user?.email}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {reward.referredName || '—'}
                          <span className="block font-mono text-[10px]">{reward.referralCode}</span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {formatDate(reward.generatedAt)}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{reward.months}</td>
                        <td className="px-4 py-2.5 text-foreground">
                          {formatCurrency(reward.amount, reward.currency)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                            {REWARD_LABELS[reward.status] || reward.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {reward.appliedAt ? formatDate(reward.appliedAt) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {reward.status !== 'voided' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => voidRewardAction(reward.id)}
                              className="text-[10px] text-danger hover:underline disabled:opacity-50"
                            >
                              Anular
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="review">
          <section className="space-y-2">
            {data.review.length === 0 ? (
              <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-[12px] text-muted-foreground">
                No hay referidos ni recompensas pendientes de revisión.
              </p>
            ) : (
              data.review.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-foreground">
                      {item.referrer?.name} → {item.referred?.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.code} · {STATUS_LABELS[item.status] || item.status}
                      {item.flagReason ? ` · ${item.flagReason}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => approveReferral(item.id)}
                      className="rounded-lg border border-brand/30 bg-brand/10 px-3 py-1.5 text-[11px] text-brand disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => rejectReferral(item.id)}
                      className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5 text-[11px] text-danger disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </TabsContent>

        <TabsContent value="audit">
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-4 py-2 font-medium">Acción</th>
                    <th className="px-4 py-2 font-medium">Actor</th>
                    <th className="px-4 py-2 font-medium">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {audit.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                        Sin operaciones registradas.
                      </td>
                    </tr>
                  ) : (
                    audit.map((entry) => (
                      <tr key={entry.id} className="text-[12px]">
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {formatDate(entry.createdAt, true)}
                        </td>
                        <td className="px-4 py-2.5 text-foreground">{entry.action}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {entry.actorRole}
                          {entry.actorUserId ? ` · ${entry.actorUserId}` : ''}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {entry.reason || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  )
}
