import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { planSlug, toPublicPlan } from '@/lib/plans'
import { SignupForm, PublicPlan } from '@/components/public/SignupForm'
import { Check, Radio, MonitorPlay, HardDrive, Clapperboard, ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

const SERVICES_META: Record<string, { label: string; icon: any; chip: string }> = {
  radio: { label: 'Radio', icon: Radio, chip: 'bg-blue-100 text-blue-700' },
  tv: { label: 'TV', icon: MonitorPlay, chip: 'bg-purple-100 text-purple-700' },
  both: { label: 'Radio + TV', icon: Clapperboard, chip: 'bg-indigo-100 text-indigo-700' },
}

async function getPlan(slug: string): Promise<{ plan: PublicPlan; popularId: string | null } | null> {
  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } })
  const publicPlans = plans.map(toPublicPlan)
  const plan = publicPlans.find((p) => planSlug(p.name) === slug)
  if (!plan) return null

  const sorted = [...publicPlans].sort((a, b) => a.price - b.price)
  const popularId = sorted.length <= 1 ? null : sorted[Math.floor((sorted.length - 1) / 2)].id
  return { plan, popularId }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const data = await getPlan(params.slug)
    if (!data) return { title: 'Plan no encontrado | IPStream' }
    return {
      title: `${data.plan.name} | IPStream - Tu Radio Online`,
      description: data.plan.description,
    }
  } catch {
    return { title: 'IPStream - Tu Radio Online' }
  }
}

export default async function PlanPage({ params }: { params: { slug: string } }) {
  const data = await getPlan(params.slug)
  if (!data) notFound()

  const { plan, popularId } = data
  const meta = SERVICES_META[plan.services] || SERVICES_META.both
  const ServiceIcon = meta.icon
  const isPopular = plan.id === popularId

  const formatPrice = (p: PublicPlan) =>
    p.currency === 'CLP' ? `$${Math.round(p.price).toLocaleString('es-CL')}` : `${p.currency} ${p.price.toLocaleString('es-CL')}`
  const fmtMB = (mb: number | null) =>
    mb && mb > 0 ? `${mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : mb + ' MB'}` : '—'

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" style={{ fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="https://ipstream.cl" className="flex items-center">
            <img src="https://ipstream.cl/images/logos/logo.png" alt="IPStream" className="h-11 w-auto" />
          </a>
          <nav className="flex items-center gap-5">
            <a href="https://ipstream.cl/planes" className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors hidden sm:inline">Planes</a>
            <a href="https://ipstream.cl/caracteristicas" className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors hidden sm:inline">Características</a>
            <a
              href="https://ipstream.cl/landing"
              className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all"
            >
              Quiero Contratar
            </a>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-6">
        <a href="/registro" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors">
          <ArrowLeft className="h-4 w-4" /> Ver todos los planes
        </a>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* ===== DETALLE DEL PLAN ===== */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
            <div className="flex items-start gap-5">
              {plan.imageUrl ? (
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={plan.imageUrl} alt={plan.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <ServiceIcon className="h-10 w-10 text-gray-400" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-3xl font-bold text-gray-900">{plan.name}</h1>
                  {isPopular && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      Más popular
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${meta.chip}`}>
                    <ServiceIcon className="h-3 w-3" /> {meta.label}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">{formatPrice(plan)}</span>
                  <span className="text-sm text-gray-500">/{plan.interval === 'monthly' ? 'mes' : 'año'}</span>
                </div>
              </div>
            </div>

            {plan.description && (
              <p className="mt-5 text-gray-600 leading-relaxed">{plan.description}</p>
            )}

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              {plan.services !== 'tv' && (
                <span className="inline-flex items-center gap-1.5">
                  <HardDrive className="h-4 w-4 text-blue-500" /> Almacenamiento Radio: {fmtMB(plan.radioStorageQuotaMB)}
                </span>
              )}
              {plan.services !== 'radio' && (
                <span className="inline-flex items-center gap-1.5">
                  <HardDrive className="h-4 w-4 text-purple-500" /> Almacenamiento TV: {fmtMB(plan.videoStorageQuotaMB)}
                </span>
              )}
            </div>
          </div>

          {plan.features.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Características del plan</h2>
              <ul className="space-y-2.5">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <Check className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ===== FORMULARIO ===== */}
        <div className="lg:sticky lg:top-8">
          <SignupForm plans={[plan]} fixedPlanId={plan.id} />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-gray-500 space-y-1.5">
          <p>© {new Date().getFullYear()} IPStream · Radio Online y Televisión por streaming</p>
          <p>
            Al crear tu cuenta aceptás nuestros{' '}
            <a href="#" className="text-blue-600 hover:underline">Términos y Condiciones</a> y{' '}
            <a href="#" className="text-blue-600 hover:underline">Política de Privacidad</a>.
          </p>
        </div>
      </footer>
    </div>
  )
}
