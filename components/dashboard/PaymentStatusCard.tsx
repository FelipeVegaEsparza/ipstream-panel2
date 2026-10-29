'use client'

import Link from 'next/link'
import { CreditCardIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface PaymentStatusCardProps {
  nextPaymentDate: Date | null
  planName: string | null
  planPrice: number | null
  status: 'paid' | 'due-soon' | 'overdue' | 'no-plan' | 'trial'
}

export function PaymentStatusCard({ nextPaymentDate, planName, planPrice, status }: PaymentStatusCardProps) {
  const { t, locale } = useDashboardI18n()

  const config = (() => {
    switch (status) {
      case 'paid':
        return { title: t('payment.status.paid'), icon: CheckCircleIcon, tone: 'text-[color:var(--live)]', badge: 'border-[color:var(--live)]/30 bg-[color:var(--live)]/10' }
      case 'due-soon':
        return { title: t('payment.status.dueSoon'), icon: ExclamationTriangleIcon, tone: 'text-[color:var(--warn)]', badge: 'border-[color:var(--warn)]/30 bg-[color:var(--warn)]/10' }
      case 'overdue':
        return { title: t('payment.status.overdue'), icon: XCircleIcon, tone: 'text-[color:var(--danger)]', badge: 'border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10' }
      case 'trial':
        return { title: t('payment.status.trial'), icon: SparklesIcon, tone: 'text-signal', badge: 'border-signal/30 bg-signal/10' }
      default:
        return { title: t('payment.status.noPlan'), icon: CreditCardIcon, tone: 'text-muted-foreground', badge: 'border-line bg-surface-3' }
    }
  })()

  const Icon = config.icon

  const daysRemaining = (() => {
    if (!nextPaymentDate) return null
    return Math.ceil((nextPaymentDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  })()

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <section className="dashboard-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-7 w-7 items-center justify-center rounded-[6px] border ${config.badge}`}>
            <Icon className={`h-4 w-4 ${config.tone}`} />
          </div>
          <div>
            <div className="dashboard-label">{t('payment.title')}</div>
            <div className={`text-[13px] font-medium ${config.tone}`}>{config.title}</div>
          </div>
        </div>

        {status !== 'no-plan' && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {planName && (
              <div>
                <div className="text-[10px] text-muted-foreground">{t('payment.currentPlan')}</div>
                <div className="text-xs font-medium text-foreground">{planName}</div>
              </div>
            )}
            {nextPaymentDate && (
              <div>
                <div className="text-[10px] text-muted-foreground">
                  {status === 'trial' ? t('payment.trialEnd') : t('payment.nextPayment')}
                </div>
                <div className="dashboard-metric text-xs text-foreground">{formatDate(nextPaymentDate)}</div>
              </div>
            )}
            {planPrice !== null && (
              <div>
                <div className="text-[10px] text-muted-foreground">
                  {status === 'trial' ? t('payment.trialCharge') : t('payment.amount')}
                </div>
                <div className="dashboard-metric text-xs text-foreground">{formatCurrency(planPrice)}</div>
              </div>
            )}
            {daysRemaining !== null && (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.badge} ${config.tone}`}>
                {daysRemaining > 0
                  ? `${daysRemaining} ${daysRemaining === 1 ? t('payment.dayRemaining') : t('payment.daysRemaining')}`
                  : daysRemaining === 0
                    ? t('payment.dueToday')
                    : `${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? t('payment.dayLate') : t('payment.daysLate')}`}
              </span>
            )}
          </div>
        )}

        <Link
          href="/dashboard/payments"
          className="rounded-control border border-line px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-3"
        >
          {t('payment.viewHistory')}
        </Link>
      </div>

      {status === 'no-plan' && (
        <p className="mt-3 border-t border-line pt-3 text-xs text-muted-foreground">{t('payment.noPlanText')}</p>
      )}
    </section>
  )
}
