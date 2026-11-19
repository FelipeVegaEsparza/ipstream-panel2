import { notFound } from 'next/navigation'
import { PanelLogo } from '@/components/ui/PanelLogo'
import { prisma } from '@/lib/prisma'
import { planSlug, toPublicPlan } from '@/lib/plans'
import { SignupForm, PublicPlan } from '@/components/public/SignupForm'
import { Radio, MonitorPlay, HardDrive, Clapperboard, ExternalLink } from 'lucide-react'
import s from './plan.module.css'

export const dynamic = 'force-dynamic'

const SERVICES_META: Record<string, { label: string; icon: any }> = {
  radio: { label: 'Radio', icon: Radio },
  tv: { label: 'TV', icon: MonitorPlay },
  both: { label: 'Radio + TV', icon: Clapperboard },
}

async function getPlan(slug: string): Promise<{ plan: PublicPlan; index: number; popularId: string | null } | null> {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { price: 'asc' },
    include: { prices: true },
  })
  const publicPlans = plans.map(toPublicPlan)
  const index = publicPlans.findIndex((p) => planSlug(p.name) === slug)
  if (index === -1) return null

  const sorted = [...publicPlans].sort((a, b) => a.price - b.price)
  const popularId = sorted.length <= 1 ? null : sorted[Math.floor((sorted.length - 1) / 2)].id
  return { plan: publicPlans[index], index, popularId }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const data = await getPlan(params.slug)
    if (!data) return { title: 'Plan no encontrado | CasterFly' }
    return {
      title: `${data.plan.name} | CasterFly - Tu Radio Online`,
      description: data.plan.description,
    }
  } catch {
    return { title: 'CasterFly - Tu Radio Online' }
  }
}

export default async function PlanPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { ref?: string }
}) {
  const data = await getPlan(params.slug)
  if (!data) notFound()

  const { plan, popularId } = data
  const referralRef = (searchParams.ref || '').trim()
  const allPlansHref = referralRef
    ? `/planes?ref=${encodeURIComponent(referralRef)}`
    : '/planes'
  const meta = SERVICES_META[plan.services] || SERVICES_META.both
  const ServiceIcon = meta.icon
  const isPopular = plan.id === popularId

  const money = (amount: number, currency: string) => {
    if (currency === 'CLP') return `$${Math.round(amount).toLocaleString('es-CL')}`
    if (currency === 'USD') {
      const hasCents = Math.round(amount * 100) % 100 !== 0
      return `US$${amount.toLocaleString('en-US', {
        minimumFractionDigits: hasCents ? 2 : 0,
        maximumFractionDigits: 2,
      })}`
    }
    return `${currency} ${amount.toLocaleString('es-CL')}`
  }
  const usdPrice = plan.prices.find((price) => price.currency === 'USD')
  const clpPrice = plan.prices.find((price) => price.currency === 'CLP')
  const period = plan.interval === 'monthly' ? 'mes' : 'año'
  const fmtMB = (mb: number | null) =>
    mb && mb > 0 ? `${mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : mb + ' MB'}` : '—'

  return (
    <div className={s.page}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      <header className={s.header}>
        <div className={s.headerInner}>
          <a className={s.brand} href="https://casterfly.com" aria-label="CasterFly inicio">
            <PanelLogo themeOverride="light" />
          </a>
          <nav className={s.nav} aria-label="Navegación principal">
            <a className={s.navLink} href="https://casterfly.com/">Inicio</a>
            <a className={s.navLink} href="https://casterfly.com/ia">IA</a>
            <a className={`${s.navLink} ${s.navActive}`} href="/planes" aria-current="page">Planes</a>
            <a className={s.navLink} href="https://casterfly.com/caracteristicas">Características</a>
            <a className={s.navLink} href="https://casterfly.com/tutoriales">Tutoriales</a>
            <a className={s.navLink} href="https://casterfly.com/noticias">Noticias</a>
            <a className={s.navLink} href="https://casterfly.com/clientes">Clientes</a>
          </nav>
          <div className={s.actions}>
            <a className={s.panelLink} href="/auth/login">Ingresar</a>
            <a className={s.cta} href="mailto:contacto@casterfly.com">Contactar</a>
          </div>
          <a className={s.mobileLogin} href="/auth/login">Ingresar</a>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className={s.heroBand}>
          <div className={s.heroBg} aria-hidden="true">
            <div className={s.heroGrid} />
            <div className={s.heroGlow} />
          </div>
          <div className={s.container}>
            <h1 className={s.display}>{plan.name}</h1>
            {plan.description && <p className={s.lede}>{plan.description}</p>}
            <div className={s.badges}>
              <span className={s.chip}>
                <ServiceIcon size={12} /> {meta.label}
              </span>
              <span className={s.chip}>{plan.aiLiveEnabled ? 'Con IA' : 'Sin IA'}</span>
              {isPopular && <span className={`${s.chip} ${s.chipPopular}`}>Más popular</span>}
            </div>
          </div>
        </section>

        {/* Detalle + formulario */}
        <section className={`${s.band} ${s.bandPanel}`}>
          <div className={s.container}>
            <div className={s.grid2}>
              <div className={s.module}>
                <div className={s.moduleStrip}>
                  <span className={s.moduleLead}>
                    <span className={s.moduleLabel}>Detalle del plan</span>
                  </span>
                  <span className={`${s.led} ${s.ledSignal}`} aria-hidden="true" />
                </div>
                <div className={s.moduleBody}>
                  {plan.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={s.planImage} src={plan.imageUrl} alt={plan.name} />
                  )}

                  <div className={s.planTitleRow}>
                    <h2 className={s.planTitle}>{plan.name}</h2>
                    <span className={`${s.badge} ${plan.aiLiveEnabled ? s.badgeAi : s.badgeNoAi}`}>
                      {plan.aiLiveEnabled ? 'Con IA' : 'Sin IA'}
                    </span>
                  </div>

                  {plan.aiLiveEnabled && Boolean(plan.aiMonthlyCharacters) && (
                    <div className={s.aiBadge}>
                      Locutor IA · {Number(plan.aiMonthlyCharacters).toLocaleString('es-CL')}{' '}
                      caracteres/mes
                    </div>
                  )}

                  <dl className={s.prices}>
                    {usdPrice && (
                      <div>
                        <dt>USD</dt>
                        <dd className={s.price}>
                          {money(usdPrice.amount, 'USD')}
                          <span className={s.per}>/{period}</span>
                        </dd>
                      </div>
                    )}
                    {clpPrice && (
                      <div>
                        <dt>CLP</dt>
                        <dd className={s.price}>
                          {money(clpPrice.amount, 'CLP')}
                          <span className={s.per}>/{period}</span>
                        </dd>
                      </div>
                    )}
                    {!usdPrice && !clpPrice && (
                      <div>
                        <dt>{plan.currency}</dt>
                        <dd className={s.price}>
                          {money(plan.price, plan.currency)}
                          <span className={s.per}>/{period}</span>
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt>Período</dt>
                      <dd>{plan.interval === 'monthly' ? 'Mensual' : 'Anual'}</dd>
                    </div>
                    <div>
                      <dt>Servicios</dt>
                      <dd>{meta.label}</dd>
                    </div>
                  </dl>

                  {plan.features.length > 0 && (
                    <ul className={s.features}>
                      {plan.features.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}

                  <div className={s.storage}>
                    {plan.services !== 'tv' && (
                      <span>
                        <HardDrive size={13} /> Radio: {fmtMB(plan.radioStorageQuotaMB)}
                      </span>
                    )}
                    {plan.services !== 'radio' && (
                      <span>
                        <HardDrive size={13} /> TV: {fmtMB(plan.videoStorageQuotaMB)}
                      </span>
                    )}
                  </div>

                  <p className={s.note}>
                    IVA no incluido · Facturación {plan.interval === 'monthly' ? 'mensual' : 'anual'}, sin contratos de permanencia.
                  </p>
                </div>
              </div>

              <div className={s.formCol}>
                {plan.demoUrl && (
                  <a className={s.demoBtn} href={plan.demoUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={18} /> Ver ejemplo del plan
                  </a>
                )}
                <SignupForm
                  plans={[plan]}
                  fixedPlanId={plan.id}
                  theme="dark"
                  referralCode={referralRef || undefined}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={s.footerGrid}>
          <div className={s.footerBrand}>
            <PanelLogo themeOverride="light" />
            <p className={s.muted}>
              Soluciones profesionales para tu radio online. Transmite, comparte y llega a más oyentes.
            </p>
          </div>
          <div className={s.footerCol}>
            <h2 className={s.footerTitle}>Enlaces</h2>
            <ul>
              <li><a href="https://casterfly.com/">Inicio</a></li>
              <li><a href="https://casterfly.com/planes">Planes</a></li>
              <li><a href="https://casterfly.com/caracteristicas">Características</a></li>
              <li><a href="https://casterfly.com/tutoriales">Tutoriales</a></li>
            </ul>
          </div>
          <div className={s.footerCol}>
            <h2 className={s.footerTitle}>Ayuda</h2>
            <ul>
              <li><a href="mailto:contacto@casterfly.com">contacto@casterfly.com</a></li>
              <li><a href={allPlansHref}>Ver todos los planes</a></li>
              <li><a href="/auth/login">Ingresar al panel</a></li>
            </ul>
          </div>
        </div>
        <div className={s.footerBottom}>
          <span>© {new Date().getFullYear()} CasterFly. Todos los derechos reservados.</span>
          <span>Hecho en Chile</span>
        </div>
      </footer>
    </div>
  )
}
