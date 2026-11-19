import Link from 'next/link'
import { Clapperboard, ExternalLink, HardDrive, MonitorPlay, Radio, Sparkles } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { PanelLogo } from '@/components/ui/PanelLogo'
import { planSlug, toPublicPlan } from '@/lib/plans'
import s from './[slug]/plan.module.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Planes y precios | CasterFly - Tu Radio Online',
  description:
    'Planes de CasterFly para radio y televisión online, con precios en USD y CLP. Sitio web, PWA y panel de administración incluidos.',
}

const SERVICES_META: Record<string, { label: string; icon: typeof Radio }> = {
  radio: { label: 'Radio', icon: Radio },
  tv: { label: 'TV', icon: MonitorPlay },
  both: { label: 'Radio + TV', icon: Clapperboard },
}

function money(amount: number, currency: string): string {
  if (currency === 'CLP') {
    return `$${Math.round(amount).toLocaleString('es-CL')}`
  }
  if (currency === 'USD') {
    const hasCents = Math.round(amount * 100) % 100 !== 0
    return `US$${amount.toLocaleString('en-US', {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2,
    })}`
  }
  return `${currency} ${amount.toLocaleString('es-CL')}`
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
            <PanelLogo themeOverride="dark" />
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

      <section className={s.heroBand}>
        <div className={s.heroBg} aria-hidden="true">
          <div className={s.heroGrid} />
          <div className={s.heroGlow} />
        </div>
        <div className={s.container}>
          <p className={s.eyebrow}>[ PLANES / PRECIOS ]</p>
          <h1 className={s.display}>Planes y precios</h1>
          <p className={s.lede}>
            Precios en USD y CLP. Elige el plan para tu radio o TV, con sitio web, PWA y panel de
            administración incluidos. Sin permanencia: cambia de plan cuando quieras.
          </p>
          {referralRef && (
            <p className={s.refNote}>
              <Sparkles size={13} /> Invitación de referido aplicada. Elige tu plan y el código se
              mantendrá en el registro.
            </p>
          )}
        </div>
      </section>

      <section className={`${s.band} ${s.bandPanel}`}>
        <div className={s.container}>
          {plans.length === 0 ? (
            <p className={s.muted}>Los planes estarán disponibles próximamente.</p>
          ) : (
            <div className={s.plansGrid}>
              {plans.map((plan, index) => {
                const meta = SERVICES_META[plan.services] || SERVICES_META.both
                const ServiceIcon = meta.icon
                const usd = plan.prices.find((price) => price.currency === 'USD')
                const clp = plan.prices.find((price) => price.currency === 'CLP')
                const period = plan.interval === 'monthly' ? 'mes' : 'año'
                const href = `/planes/${planSlug(plan.name)}${refQuery}`

                return (
                  <article key={plan.id} className={s.module}>
                    <div className={s.moduleStrip}>
                      <span className={s.moduleLead}>
                        <span className={s.moduleLabel}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
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

                      {plan.description && <p className={s.planDesc}>{plan.description}</p>}

                      {plan.aiLiveEnabled && Boolean(plan.aiMonthlyCharacters) && (
                        <div className={s.aiBadge}>
                          <Sparkles size={12} />
                          Locutor IA · {Number(plan.aiMonthlyCharacters).toLocaleString('es-CL')}{' '}
                          caracteres/mes
                        </div>
                      )}

                      <dl className={s.prices}>
                        {usd && (
                          <div>
                            <dt>USD</dt>
                            <dd className={s.price}>
                              {money(usd.amount, 'USD')}
                              <span className={s.per}>/{period}</span>
                            </dd>
                          </div>
                        )}
                        {clp && (
                          <div>
                            <dt>CLP</dt>
                            <dd className={s.price}>
                              {money(clp.amount, 'CLP')}
                              <span className={s.per}>/{period}</span>
                            </dd>
                          </div>
                        )}
                        {!usd && !clp && (
                          <div>
                            <dt>{plan.currency}</dt>
                            <dd className={s.price}>
                              {money(plan.price, plan.currency)}
                              <span className={s.per}>/{period}</span>
                            </dd>
                          </div>
                        )}
                      </dl>

                      <div className={s.storage}>
                        {plan.services !== 'tv' && (
                          <span>
                            <HardDrive size={13} /> Radio: {formatMB(plan.radioStorageQuotaMB)}
                          </span>
                        )}
                        {plan.services !== 'radio' && (
                          <span>
                            <HardDrive size={13} /> TV: {formatMB(plan.videoStorageQuotaMB)}
                          </span>
                        )}
                        <span>
                          <ServiceIcon size={13} /> {meta.label}
                        </span>
                      </div>

                      <ul className={s.features}>
                        {plan.features.map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>

                      <p className={s.note}>
                        IVA no incluido · Facturación {plan.interval === 'monthly' ? 'mensual' : 'anual'}, sin
                        contratos de permanencia.
                      </p>

                      <div className={s.planActions}>
                        <Link href={href} className={s.btnPrimary}>
                          Elegir plan
                        </Link>
                        {plan.demoUrl && (
                          <a
                            href={plan.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={s.btnGhost}
                          >
                            <ExternalLink size={14} /> Ver ejemplo
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <footer className={s.footer}>
        <div className={s.footerGrid}>
          <div className={s.footerBrand}>
            <PanelLogo themeOverride="dark" />
            <p className={s.muted}>
              Soluciones profesionales para tu radio online. Transmite, comparte y llega a más
              oyentes con la plataforma más completa del mercado.
            </p>
          </div>
          <nav className={s.footerCol} aria-label="Enlaces">
            <h2 className={s.footerTitle}>Enlaces</h2>
            <ul>
              <li><a href="https://casterfly.com/">Inicio</a></li>
              <li><a href="https://casterfly.com/ia">IA</a></li>
              <li><a href="/planes">Planes</a></li>
              <li><a href="https://casterfly.com/caracteristicas">Características</a></li>
              <li><a href="https://casterfly.com/tutoriales">Tutoriales</a></li>
            </ul>
          </nav>
          <div className={s.footerCol}>
            <h2 className={s.footerTitle}>Panel</h2>
            <ul>
              <li><a href="/auth/login">Ingresar al panel</a></li>
              <li><a href="/planes">Ver planes</a></li>
              <li><a href="mailto:contacto@casterfly.com">contacto@casterfly.com</a></li>
            </ul>
          </div>
        </div>
        <div className={s.footerBottom}>
          <p>© {new Date().getFullYear()} CasterFly. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
