import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { CheckCircleIcon, ArrowRightIcon, PlayCircleIcon } from '@heroicons/react/24/outline'
import { authOptions } from '@/lib/auth'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { getOnboarding, getOnboardingIntro } from '@/lib/onboarding'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export const dynamic = 'force-dynamic'

const STEP_KEYS = {
  brand: { title: 'onboarding.brand.title', description: 'onboarding.brand.description', action: 'onboarding.brand.action' },
  programs: { title: 'onboarding.programs.title', description: 'onboarding.programs.description', action: 'onboarding.programs.action' },
  'radio-library': { title: 'onboarding.radio-library.title', description: 'onboarding.radio-library.description', action: 'onboarding.radio-library.action' },
  'radio-autodj': { title: 'onboarding.radio-autodj.title', description: 'onboarding.radio-autodj.description', action: 'onboarding.radio-autodj.action' },
  'tv-library': { title: 'onboarding.tv-library.title', description: 'onboarding.tv-library.description', action: 'onboarding.tv-library.action' },
  'tv-autodj': { title: 'onboarding.tv-autodj.title', description: 'onboarding.tv-autodj.description', action: 'onboarding.tv-autodj.action' },
  news: { title: 'onboarding.news.title', description: 'onboarding.news.description', action: 'onboarding.news.action' },
  site: { title: 'onboarding.site.title', description: 'onboarding.site.description', action: 'onboarding.site.action' },
  'gc-bar': { title: 'onboarding.gc-bar.title', description: 'onboarding.gc-bar.description', action: 'onboarding.gc-bar.action' },
} as const

function ytEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|[?&]v=|embed\/)([A-Za-z0-9_-]{11})/)
  return m ? `https://www.youtube.com/embed/${m[1]}` : null
}

export default async function FirstStepsPage() {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)
  const effective = await getEffectiveClient()

  if (!session?.user || !effective) {
    return <div className="text-center py-12 text-muted-foreground">{t('onboarding.loginRequired')}</div>
  }

  const [progress, intro] = await Promise.all([
    getOnboarding(effective.clientId),
    getOnboardingIntro(),
  ])

  const servicesLabel = t(`onboarding.services.${progress.services}` as 'onboarding.services.radio' | 'onboarding.services.tv' | 'onboarding.services.both')
  const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0
  const embed = intro ? ytEmbed(intro.youtubeUrl) : null

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">{t('onboarding.title')}</h1>
        <p className="text-muted-foreground">
          {t('onboarding.subtitle', { services: servicesLabel })}
        </p>
      </div>

      {embed && (
        <div className="rounded-2xl overflow-hidden border border-border bg-black aspect-video">
          <iframe
            src={embed}
            title={intro?.title || t('onboarding.videoTitle')}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground font-medium">
            {t('onboarding.completed', { completed: progress.completed, total: progress.total })}
          </span>
          <span className="text-sm text-muted-foreground">{pct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-card overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand to-brand transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="space-y-3">
        {progress.steps.map((step, i) => {
          const keys = STEP_KEYS[step.key as keyof typeof STEP_KEYS]
          return (
          <li
            key={step.key}
            className={`flex items-start gap-4 rounded-xl border p-4 ${
              step.done ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-card/40'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {step.done ? (
                <CheckCircleIcon className="h-6 w-6 text-green-400" />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs text-muted-foreground">
                  {i + 1}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`font-medium ${step.done ? 'text-green-300' : 'text-foreground'}`}>
                {keys ? t(keys.title) : step.title}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">{keys ? t(keys.description) : step.description}</p>
            </div>
            {!step.done && (
              <Link
                href={step.href}
                className="shrink-0 self-center inline-flex items-center gap-1.5 rounded-lg bg-brand hover:bg-brand px-3 py-2 text-sm font-medium text-white transition-colors"
              >
                {keys ? t(keys.action) : step.actionLabel} <ArrowRightIcon className="h-4 w-4" />
              </Link>
            )}
          </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/dashboard/tutorials"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:text-brand"
        >
          <PlayCircleIcon className="h-5 w-5" /> {t('onboarding.allTutorials')}
        </Link>
      </div>
    </div>
  )
}
