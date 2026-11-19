import Link from 'next/link'
import { Check, Clapperboard, HardDrive, MonitorPlay, Radio } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { PanelLogo } from '@/components/ui/PanelLogo'
import { planSlug, toPublicPlan } from '@/lib/plans'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Planes | CasterFly - Tu Radio Online',
  description:
    'Elige el plan de CasterFly para tu radio o televisión online. Radio, TV o ambos, con sitio web, PWA y panel de administración.',
}

const SERVICES_META: Record<string, { label: string; icon: typeof Radio }> = {
  radio: { label: 'Radio', icon: Radio },
  tv: { label: 'TV', icon: MonitorPlay },
  both: { label: 'Radio + TV', icon: Clapperboard },
}

function formatAmount(amount: number, currency: string): string {
  if (currency === 'CLP') {
    return `$${Math.round(amount).toLocaleString('es-CL')}`
  }
  return `US$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatMB(mb: number | null): string {
  if (!mb || mb <= 0) return '—'
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`
}

export default async function PlanesPage({
  searchParams,
}: {
  searchParams: { ref?: string }
}) {
  const plans = (
    await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
      include: { prices: true },
    })
  ).map(toPublicPlan)

  const referralRef = (searchParams.ref || '').trim()
  const refQuery = referralRef ? `?ref=${encodeURIComponent(referralRef)}` : ''

  return (
    <div
      className="min-h-screen bg-gray-50 text-gray-900"
      style={{ fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif' }}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <a href="https://casterfly.com" className="flex items-center">
            <PanelLogo themeOverride="light" className="h-11 w-auto" />
          </a>
          <nav className="flex items-center gap-5">
            <a
              href="https://casterfly.com/caracteristicas"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-brand sm:inline"
            >
              Características
            </a>
            <a
              href="/auth/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-brand"
            >
              Ingresar
            </a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-8 pt-10 text-center">
        <span className="mb-4 inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-brand">
          PLANES
        </span>
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">
          Elige el plan para tu <span className="text-brand">radio o TV</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Sitio web profesional, reproductor, app PWA y panel de administración. Sin permanencia:
          cambia de plan cuando quieras.
        </p>
        {referralRef && (
          <p className="mx-auto mt-4 max-w-xl rounded-xl border border-brand/30 bg-brand/5 px-4 py-2 text-sm text-brand">
            Invitación de referido aplicada. Elige tu plan y el código se mantendrá en el registro.
          </p>
        )}
      </section>

      <main className="mx-auto max-w-5xl px-4 pb-14">
        {plans.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-muted-foreground">
            Los planes estarán disponibles próximamente.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const meta = SERVICES_META[plan.services] || SERVICES_META.both
              const ServiceIcon = meta.icon
              const price = plan.prices.find((p) => p.currency === plan.currency)?.amount ?? plan.price
              const href = `/planes/${planSlug(plan.name)}${refQuery}`

              return (
                <article
                  key={plan.id}
                  className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    {plan.imageUrl ? (
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={plan.imageUrl}
                          alt={plan.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                        <ServiceIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900">{plan.name}</h2>
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                        <ServiceIcon className="h-3 w-3" /> {meta.label}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900">
                      {formatAmount(price, plan.currency)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      /{plan.interval === 'monthly' ? 'mes' : 'año'}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {plan.services !== 'tv' && (
                      <span className="inline-flex items-center gap-1">
                        <HardDrive className="h-3 w-3 text-brand" /> Radio: {formatMB(plan.radioStorageQuotaMB)}
                      </span>
                    )}
                    {plan.services !== 'radio' && (
                      <span className="inline-flex items-center gap-1">
                        <HardDrive className="h-3 w-3 text-purple-500" /> TV: {formatMB(plan.videoStorageQuotaMB)}
                      </span>
                    )}
                  </div>

                  {plan.features.length > 0 && (
                    <ul className="mt-4 flex-1 space-y-1.5">
                      {plan.features.slice(0, 5).map((feature) => (
                        <li key={feature} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Link
                    href={href}
                    className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  >
                    Elegir este plan
                  </Link>
                </article>
              )
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-5xl space-y-1.5 px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} CasterFly · Radio Online y Televisión por streaming</p>
          <p>
            Al crear tu cuenta aceptas nuestros{' '}
            <a href="/legal/terminos" className="text-brand hover:underline">Términos y Condiciones</a>, la{' '}
            <a href="/legal/privacidad" className="text-brand hover:underline">Política de Privacidad</a> y la{' '}
            <a href="/legal/licencias" className="text-brand hover:underline">
              Declaración de Licencias y Responsabilidad de Contenido
            </a>.
          </p>
        </div>
      </footer>
    </div>
  )
}
