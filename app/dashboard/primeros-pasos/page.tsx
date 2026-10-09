import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { CheckCircleIcon, ArrowRightIcon, PlayCircleIcon } from '@heroicons/react/24/outline'
import { authOptions } from '@/lib/auth'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { getOnboarding, getOnboardingIntro, getServicesLabel } from '@/lib/onboarding'

export const dynamic = 'force-dynamic'

function ytEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|[?&]v=|embed\/)([A-Za-z0-9_-]{11})/)
  return m ? `https://www.youtube.com/embed/${m[1]}` : null
}

export default async function FirstStepsPage() {
  const session = await getServerSession(authOptions)
  const effective = await getEffectiveClient()

  if (!session?.user || !effective) {
    return <div className="text-center py-12 text-muted-foreground">Inicia sesión para ver esta sección.</div>
  }

  const [progress, intro] = await Promise.all([
    getOnboarding(effective.clientId),
    getOnboardingIntro(),
  ])

  const servicesLabel = getServicesLabel(progress.services)
  const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0
  const embed = intro ? ytEmbed(intro.youtubeUrl) : null

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Primeros pasos</h1>
        <p className="text-muted-foreground">
          Te guiamos para dejar {servicesLabel} funcionando. Se completa a medida que vas haciendo.
        </p>
      </div>

      {embed && (
        <div className="rounded-2xl overflow-hidden border border-border bg-black aspect-video">
          <iframe
            src={embed}
            title={intro?.title || 'Video de bienvenida'}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground font-medium">
            {progress.completed} de {progress.total} completados
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
        {progress.steps.map((step, i) => (
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
                {step.title}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
            </div>
            {!step.done && (
              <Link
                href={step.href}
                className="shrink-0 self-center inline-flex items-center gap-1.5 rounded-lg bg-brand hover:bg-brand px-3 py-2 text-sm font-medium text-white transition-colors"
              >
                {step.actionLabel} <ArrowRightIcon className="h-4 w-4" />
              </Link>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/dashboard/tutorials"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:text-brand"
        >
          <PlayCircleIcon className="h-5 w-5" /> Ver todos los tutoriales
        </Link>
      </div>
    </div>
  )
}
