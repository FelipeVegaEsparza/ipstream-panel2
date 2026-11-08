import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PaymentStatusCard } from '@/components/dashboard/PaymentStatusCard'
import { NowPlayingDisplay } from '@/components/dashboard/streaming/NowPlayingDisplay'
import { NowPlayingTvDisplay } from '@/components/dashboard/NowPlayingTvDisplay'
import { DashboardOverviewCards } from '@/components/dashboard/DashboardOverviewCards'
import { AiCreditsCard } from '@/components/dashboard/AiCreditsCard'
import { getAiLiveAccess } from '@/lib/ai-live'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { getOnboarding } from '@/lib/onboarding'
import { OnboardingDismiss } from '@/components/dashboard/OnboardingDismiss'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { SUBSCRIPTION_STATUS } from '@/lib/subscription-status'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export default async function DashboardPage() {
  const locale = getDashboardLocale()
  const t = dashboardT(locale)
  const session = await getServerSession(authOptions)
  const effectiveClient = await getEffectiveClient()
  
  if (!session?.user) {
    return <div>{locale === 'en' ? 'Error: No active session' : 'Error: No hay sesión activa'}</div>
  }

  // Verificar que tenemos un cliente efectivo
  if (!effectiveClient) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          {t('dashboard.noClientTitle')}
        </h3>
        <p className="text-muted-foreground mb-4">
          {t('dashboard.noClientText')}
        </p>
        {session.user.role === 'ADMIN' ? (
          <a
            href="/admin"
            className="inline-flex items-center px-4 py-2 bg-signal text-white text-sm font-medium rounded-control hover:brightness-110 transition-colors"
          >
            {t('dashboard.goDashboard')}
          </a>
        ) : (
          <a
            href="/auth/login"
            className="inline-flex items-center px-4 py-2 bg-signal text-white text-sm font-medium rounded-control hover:brightness-110 transition-colors"
          >
            {t('dashboard.login')}
          </a>
        )}
      </div>
    )
  }

  const [
    basicData,
    clientInfo,
    subscription
  ] = await Promise.all([
    prisma.basicData.findUnique({ where: { clientId: effectiveClient.clientId } }),
    prisma.client.findUnique({ 
      where: { id: effectiveClient.clientId },
      include: { user: true, plan: true }
    }),
    prisma.subscription.findFirst({
      where: { 
        clientId: effectiveClient.clientId,
        status: { in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIALING] }
      },
      include: { plan: true },
      orderBy: { endDate: 'desc' }
    })
  ])

  // Calcular estado de pago
  let paymentStatus: 'paid' | 'due-soon' | 'overdue' | 'no-plan' = 'no-plan'
  let nextPaymentDate: Date | null = null
  let planName: string | null = null
  let planPrice: number | null = null

  if (subscription && clientInfo?.plan) {
    planName = clientInfo.plan.name
    planPrice = clientInfo.plan.price

    // Buscar el próximo pago pendiente (el más cercano por dueDate)
    const nextPendingPayment = await prisma.payment.findFirst({
      where: {
        clientId: effectiveClient.clientId,
        subscriptionId: subscription.id,
        status: 'pending'
      },
      orderBy: { dueDate: 'asc' } // El más cercano primero
    })

    if (nextPendingPayment) {
      nextPaymentDate = nextPendingPayment.dueDate

      const now = new Date()
      const daysUntilPayment = Math.ceil((nextPaymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilPayment < 0) {
        paymentStatus = 'overdue'
      } else if (daysUntilPayment <= 7) {
        paymentStatus = 'due-soon'
      } else {
        paymentStatus = 'paid'
      }
    } else {
      // Si no hay pagos pendientes, usar la fecha de fin de la suscripción
      nextPaymentDate = subscription.endDate
      paymentStatus = 'paid'
    }
  }

  // Almacenamiento usado vs. cuota, según los servicios que incluye el plan
  const planServices = clientInfo?.plan?.services || 'both'
  const hasRadio = planServices === 'radio' || planServices === 'both'
  const hasTv = planServices === 'tv' || planServices === 'both'

  const [usageRadio, usageVideo] = await Promise.all([
    hasRadio ? import('@/lib/streaming-helpers').then((m) => m.getStorageUsage(effectiveClient.clientId)) : null,
    hasTv ? import('@/lib/streaming-helpers').then((m) => m.getVideoStorageUsage(effectiveClient.clientId)) : null,
  ])

  const [onboarding, aiAccess, aiCreditPackCount] = await Promise.all([
    getOnboarding(effectiveClient.clientId),
    getAiLiveAccess(effectiveClient.clientId),
    prisma.aiCreditPack.count({ where: { isActive: true } }),
  ])

  const paymentNeedsAttention = paymentStatus === 'due-soon' || paymentStatus === 'overdue'
  const quotaExceeded = Boolean(usageRadio?.exceeded || usageVideo?.exceeded)
  const hasAttention = (!onboarding.allDone && !onboarding.dismissed) || !basicData || paymentNeedsAttention || quotaExceeded
  const clientTimezone = clientInfo?.timezone || 'UTC'
  const formatInClientTimezone = (options: Intl.DateTimeFormatOptions) => {
    const localeTag = locale === 'en' ? 'en-US' : 'es-CL'
    try {
      return new Intl.DateTimeFormat(localeTag, { ...options, timeZone: clientTimezone }).format(new Date())
    } catch {
      return new Intl.DateTimeFormat(localeTag, options).format(new Date())
    }
  }
  const dateLabel = formatInClientTimezone({ weekday: 'short', day: '2-digit', month: 'short' })
  const timeLabel = formatInClientTimezone({ hour: '2-digit', minute: '2-digit' })
  const onAirGrid = hasRadio && hasTv ? 'sm:grid-cols-2 sm:divide-x sm:divide-line' : ''

  return (
    <div className="space-y-7">
      <header className="border-b border-line pb-5">
        <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
          {clientInfo?.name || t('dashboard.stationFallback')}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span>{planName || t('overview.noPlan')}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{dateLabel} · {timeLabel}</span>
          {effectiveClient.isImpersonating && (
            <span className="text-amber-400">{t('dashboard.impersonationMode')}</span>
          )}
        </div>
      </header>

      <section className="dashboard-panel overflow-hidden" aria-label={t('dashboard.onAir')}>
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="text-[13px] font-medium text-foreground">{t('dashboard.onAir')}</h2>
          <span className="text-[10px] text-muted-foreground">
            {hasRadio && hasTv ? 'Radio + TV' : hasRadio ? t('nowPlaying.radio') : hasTv ? t('nowPlaying.tv') : '—'}
          </span>
        </div>
        <div className={`grid ${onAirGrid}`}>
          {hasRadio && <NowPlayingDisplay />}
          {hasTv && <NowPlayingTvDisplay />}
          {!hasRadio && !hasTv && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">{t('overview.noStreaming')}</p>
              <Link href="/dashboard/basic-data" className="mt-2 inline-flex text-xs font-medium text-signal hover:underline">
                {t('dashboard.completeInfo')}
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="dashboard-panel overflow-hidden" aria-label={t('overview.listeners')}>
          <DashboardOverviewCards
            plan={clientInfo?.plan as any}
            usageRadio={usageRadio}
            usageVideo={usageVideo}
          />
          <AiCreditsCard
            limit={aiAccess.limit}
            used={aiAccess.used}
            remaining={aiAccess.remaining}
            period={aiAccess.period}
            hasActivePacks={aiCreditPackCount > 0}
            embedded
          />
        </section>

        <aside className="dashboard-panel overflow-hidden" aria-label={t('dashboard.status')}>
          <div className="border-b border-line px-4 py-2.5">
            <h2 className="text-[13px] font-medium text-foreground">{t('dashboard.status')}</h2>
          </div>
          <div className="divide-y divide-line">
            {!onboarding.allDone && !onboarding.dismissed && (
              <div className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground">{t('dashboard.firstSteps')}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t('dashboard.firstStepsProgress', { pending: onboarding.pending, total: onboarding.total })}
                    </p>
                    <div className="mt-2 h-0.5 w-full bg-surface-3">
                      <div
                        className="h-full bg-[color:var(--text-3)]"
                        style={{ width: `${Math.round((onboarding.completed / onboarding.total) * 100)}%` }}
                      />
                    </div>
                    <Link
                      href="/dashboard/primeros-pasos"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-signal hover:underline"
                    >
                      {t('dashboard.continue')} <ArrowRightIcon className="h-3 w-3" />
                    </Link>
                  </div>
                  <OnboardingDismiss />
                </div>
              </div>
            )}

            {!basicData && (
              <div className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--warn)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground">{t('dashboard.basicInfoTitle')}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{t('dashboard.basicInfoText')}</p>
                    <Link
                      href="/dashboard/basic-data"
                      className="mt-1.5 inline-flex text-[11px] font-medium text-warn hover:underline"
                    >
                      {t('dashboard.completeInfo')}
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {quotaExceeded && (
              <div className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--danger)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground">{t('dashboard.quotaExceeded')}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t('dashboard.quotaExceededHint', { service: usageRadio?.exceeded ? t('nowPlaying.radio') : t('nowPlaying.tv') })}
                    </p>
                    <Link
                      href={usageRadio?.exceeded ? '/dashboard/streaming/library' : '/dashboard/television/library'}
                      className="mt-1.5 inline-flex text-[11px] font-medium text-danger hover:underline"
                    >
                      {t('dashboard.viewLibrary')}
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {!hasAttention && (
              <p className="px-4 py-3 text-[11px] text-muted-foreground">{t('dashboard.noPending')}</p>
            )}

            <PaymentStatusCard
              nextPaymentDate={nextPaymentDate}
              planName={planName}
              planPrice={planPrice}
              status={paymentStatus}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
