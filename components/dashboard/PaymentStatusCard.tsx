'use client'

import Link from 'next/link'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface PaymentStatusCardProps {
  nextPaymentDate: Date | null
  planName: string | null
  planPrice: number | null
  status: 'paid' | 'due-soon' | 'overdue' | 'no-plan'
}

export function PaymentStatusCard({ nextPaymentDate, planName, planPrice, status }: PaymentStatusCardProps) {
  const { t, locale } = useDashboardI18n()

  const config = (() => {
    switch (status) {
      case 'due-soon':
        return { title: t('payment.status.dueSoon'), tone: 'text-[color:var(--warn)]', dot: 'bg-[color:var(--warn)]' }
      case 'overdue':
        return { title: t('payment.status.overdue'), tone: 'text-[color:var(--danger)]', dot: 'bg-[color:var(--danger)]' }
      case 'paid':
        return { title: t('payment.status.paid'), tone: 'text-foreground', dot: 'bg-[color:var(--text-3)]' }
      default:
        return { title: t('payment.status.noPlan'), tone: 'text-muted-foreground', dot: 'bg-[color:var(--text-3)]' }
    }
  })()

  const daysRemaining = nextPaymentDate
    ? Math.ceil((nextPaymentDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  return (
    <section className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} />
          <span className="text-[11px] text-muted-foreground">{t('payment.shortTitle')}</span>
          <span className={`text-[13px] font-medium ${config.tone}`}>{config.title}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {status !== 'no-plan' && planName && <span>{planName}</span>}
          {status !== 'no-plan' && nextPaymentDate && (
            <span>
              {t('payment.nextPayment')}{' '}
              <span className="dashboard-metric text-foreground">{formatDate(nextPaymentDate)}</span>
            </span>
          )}
          {status !== 'no-plan' && planPrice !== null && (
            <span className="dashboard-metric text-foreground">{formatCurrency(planPrice)}</span>
          )}
          {status !== 'no-plan' && daysRemaining !== null && (
            <span>
              {daysRemaining > 0
                ? `${daysRemaining} ${daysRemaining === 1 ? t('payment.dayRemaining') : t('payment.daysRemaining')}`
                : daysRemaining === 0
                  ? t('payment.dueToday')
                  : `${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? t('payment.dayLate') : t('payment.daysLate')}`}
            </span>
          )}
          <Link href="/dashboard/payments" className="text-signal hover:underline">
            {t('payment.history')}
          </Link>
        </div>
      </div>

      {status === 'no-plan' && (
        <p className="mt-2 text-[11px] text-muted-foreground">{t('payment.noPlanText')}</p>
      )}
    </section>
  )
}
