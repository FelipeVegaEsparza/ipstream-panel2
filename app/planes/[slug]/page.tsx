import { notFound } from 'next/navigation'
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
  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } })
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

  const config = await prisma.appConfig.findFirst({ select: { trialDays: true } })
  const trialDays = config?.trialDays ?? 7

  const formatPrice = (p: PublicPlan) =>
    p.currency === 'CLP' ? `$${Math.round(p.price).toLocaleString('es-CL')}` : `${p.currency} ${p.price.toLocaleString('es-CL')}`
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
          <a className={s.brand} href="https://ipstream.cl" aria-label="IPStream inicio">
            <img src="https://ipstream.cl/images/logos/logo.png" alt="IPStream" />
          </a>
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
              {isPopular && <span className={`${s.chip} ${s.chipPopular}`}>Más popular</span>}
              {trialDays > 0 && <span className={s.chip}>{trialDays} días gratis</span>}
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

                  <h2 className={s.planTitle}>{plan.name}</h2>

                  <dl className={s.prices}>
                    <div>
                      <dt>Facturación</dt>
                      <dd className={s.price}>{formatPrice(plan)}</dd>
                    </div>
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
                <SignupForm plans={[plan]} fixedPlanId={plan.id} theme="dark" trialDays={trialDays} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={s.footerGrid}>
          <div className={s.footerBrand}>
            <img src="https://ipstream.cl/images/logos/logo.png" alt="IPStream" />
            <p className={s.muted}>
              Soluciones profesionales para tu radio online. Transmite, comparte y llega a más oyentes.
            </p>
          </div>
          <div className={s.footerCol}>
            <h2 className={s.footerTitle}>Enlaces</h2>
            <ul>
              <li><a href="https://ipstream.cl/">Inicio</a></li>
              <li><a href="https://ipstream.cl/planes">Planes</a></li>
              <li><a href="https://ipstream.cl/caracteristicas">Características</a></li>
              <li><a href="https://ipstream.cl/tutoriales">Tutoriales</a></li>
            </ul>
          </div>
          <div className={s.footerCol}>
            <h2 className={s.footerTitle}>Ayuda</h2>
            <ul>
              <li><a href="mailto:contacto@ipstream.cl">contacto@ipstream.cl</a></li>
              <li><a href="/registro">Ver todos los planes</a></li>
              <li><a href="/auth/login">Ingresar al panel</a></li>
            </ul>
          </div>
        </div>
        <div className={s.footerBottom}>
          <span>© {new Date().getFullYear()} IPStream. Todos los derechos reservados.</span>
          <span>Hecho en Chile</span>
        </div>
      </footer>
    </div>
  )
}
