'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Radio, MonitorPlay, HardDrive, ArrowRight, CheckCircle2, User, Mail, Lock, ShieldCheck, Clapperboard, Sparkles } from 'lucide-react'
import styles from './SignupForm.module.css'

export interface PublicPlan {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  interval: string
  features: string[]
  maxDjs: number
  services: string
  radioStorageQuotaMB: number | null
  videoStorageQuotaMB: number | null
  imageUrl: string | null
  demoUrl?: string | null
}

const SERVICES_META: Record<string, { label: string; icon: any; chip: string }> = {
  radio: { label: 'Radio', icon: Radio, chip: 'bg-blue-100 text-brand' },
  tv: { label: 'TV', icon: MonitorPlay, chip: 'bg-purple-100 text-purple-700' },
  both: { label: 'Radio + TV', icon: Clapperboard, chip: 'bg-indigo-100 text-brand' },
}

function FixedPlanSummary({ plan }: { plan: PublicPlan }) {
  const meta = SERVICES_META[plan.services] || SERVICES_META.both
  const ServiceIcon = meta.icon
  const price =
    plan.currency === 'CLP'
      ? `$${Math.round(plan.price).toLocaleString('es-CL')}`
      : `${plan.currency} ${plan.price.toLocaleString('es-CL')}`
  const fmtMB = (mb: number | null) =>
    mb && mb > 0 ? `${mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : mb + ' MB'}` : '—'

  return (
    <div data-slot="card" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex gap-4">
        {plan.imageUrl ? (
          <div data-slot="icon-wrap" className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={plan.imageUrl} alt={plan.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div data-slot="icon-wrap" className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <ServiceIcon data-slot="icon" className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 data-slot="heading" className="text-xl font-bold text-gray-900">{plan.name}</h2>
            <span data-slot="chip" className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${meta.chip}`}>
              <ServiceIcon className="h-3 w-3" /> {meta.label}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span data-slot="summary-price" className="text-2xl font-bold text-gray-900">{price}</span>
            <span data-slot="muted" className="text-sm text-foreground0">/{plan.interval === 'monthly' ? 'mes' : 'año'}</span>
          </div>
        </div>
      </div>
      <div data-slot="muted" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground0">
        {plan.services !== 'tv' && (
          <span className="inline-flex items-center gap-1">
            <HardDrive data-slot="icon" className="h-3 w-3 text-brand" /> Radio: {fmtMB(plan.radioStorageQuotaMB)}
          </span>
        )}
        {plan.services !== 'radio' && (
          <span className="inline-flex items-center gap-1">
            <HardDrive data-slot="icon" className="h-3 w-3 text-purple-500" /> TV: {fmtMB(plan.videoStorageQuotaMB)}
          </span>
        )}
      </div>
    </div>
  )
}

export function SignupForm({ plans, preselect, fixedPlanId, theme = 'light', trialDays = 0 }: { plans: PublicPlan[]; preselect?: string; fixedPlanId?: string; theme?: 'light' | 'dark'; trialDays?: number }) {
  const darkClass = theme === 'dark' ? styles.dark : ''
  const isFixed = Boolean(fixedPlanId)
  const fixedPlan = fixedPlanId ? plans.find((p) => p.id === fixedPlanId) || null : null
  const initial = fixedPlanId
    ? fixedPlan?.id || fixedPlanId
    : plans.find((p) => p.name === preselect || p.id === preselect)?.id || plans[0]?.id || ''
  const [planId, setPlanId] = useState<string>(initial)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [radioName, setRadioName] = useState('')
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid' | 'unconfigured'>('idle')
  const [siteHost, setSiteHost] = useState('')
  const [createdSiteUrl, setCreatedSiteUrl] = useState<string | null>(null)

  // Chequeo de disponibilidad del subdominio (debounce).
  useEffect(() => {
    const n = radioName.trim()
    if (!n) {
      setSlugStatus('idle')
      setSiteHost('')
      return
    }
    setSlugStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/public/check-subdomain?name=${encodeURIComponent(n)}`)
        const d = await res.json().catch(() => ({}))
        if (d?.hostname) setSiteHost(d.hostname)
        if (d?.available) setSlugStatus('available')
        else setSlugStatus(
          d?.reason === 'reserved' ? 'reserved'
            : d?.reason === 'unconfigured' ? 'unconfigured'
              : d?.reason === 'invalid' || d?.reason === 'short' || d?.reason === 'empty' ? 'invalid'
                : 'taken'
        )
      } catch {
        setSlugStatus('idle')
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [radioName])

  const selected = plans.find((p) => p.id === planId) || null
  const formatPrice = (p: PublicPlan) =>
    p.currency === 'CLP' ? `$${Math.round(p.price).toLocaleString('es-CL')}` : `${p.currency} ${p.price.toLocaleString('es-CL')}`
  const fmtMB = (mb: number | null) =>
    mb && mb > 0 ? `${mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : mb + ' MB'}` : '—'

  const popularId = (() => {
    const sorted = [...plans].sort((a, b) => a.price - b.price)
    if (sorted.length <= 1) return null
    return sorted[Math.floor((sorted.length - 1) / 2)].id
  })()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!planId) {
      setError('Elige un plan')
      return
    }
    if (!radioName.trim()) {
      setError('Ingresa el nombre de la radio')
      return
    }
    if (slugStatus === 'taken') {
      setError('Ese nombre de radio ya está en uso. Elige otro.')
      return
    }
    if (slugStatus === 'reserved') {
      setError('Ese nombre de radio está reservado. Elige otro.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, planId, radioName }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Error al registrarte. Intentá de nuevo.')
        return
      }
      setCreatedSiteUrl(data?.siteUrl || null)
      setDone(true)
    } catch {
      setError('Error al registrarte. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    const chargeDate = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
    const chargeLabel = chargeDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    return (
      <div className={`max-w-md mx-auto text-center space-y-5 py-12 ${darkClass}`}>
        <div data-slot="done-icon" className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 data-slot="heading" className="text-2xl font-bold text-gray-900">¡Tu cuenta está lista!</h2>
        <p data-slot="sub" className="text-muted-foreground">
          {trialDays > 0
            ? `Empezaron tus ${trialDays} días de prueba gratis. Ya puedes ingresar y transmitir; el primer cobro se realizará el ${chargeLabel}.`
            : 'Te enviamos la boleta del mes por correo. Cuando se confirme el pago, tu plan queda activo y puedes empezar a transmitir.'}
        </p>
        {selected && (
          <div data-slot="summary" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
            Plan <span data-slot="accent" className="font-semibold text-brand">{selected.name}</span> · {formatPrice(selected)}/{selected.interval === 'monthly' ? 'mes' : 'año'}
          </div>
        )}
        {createdSiteUrl && (
          <div data-slot="site" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Tu sitio ya está online:{' '}
            <a href={createdSiteUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
              {createdSiteUrl.replace('https://', '')}
            </a>
          </div>
        )}
        <Link
          data-slot="submit"
          href="/auth/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand hover:bg-brand text-white font-medium shadow-lg shadow-blue-600/20 transition-all"
        >
          Iniciar sesión <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className={`${isFixed ? 'max-w-md mx-auto space-y-6' : 'grid grid-cols-1 lg:grid-cols-2 gap-10 items-start'} ${darkClass}`}>
      {/* ===== PLANES ===== */}
      {isFixed ? (
        fixedPlan ? <FixedPlanSummary plan={fixedPlan} /> : null
      ) : (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Elige tu plan</h2>
          <p className="text-foreground0 mt-1">Precios simples, sin permanencia. Cambia de plan cuando quieras.</p>
        </div>

        {plans.length === 0 ? (
          <p className="text-foreground0 text-sm">Los planes estarán disponibles próximamente.</p>
        ) : (
          plans.map((p) => {
            const isSelected = planId === p.id
            const isPopular = p.id === popularId
            const meta = SERVICES_META[p.services] || SERVICES_META.both
            const ServiceIcon = meta.icon
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlanId(p.id)}
                className={`w-full text-left flex gap-5 rounded-2xl border p-5 transition-all ${
                  isSelected
                    ? 'border-brand ring-2 ring-blue-600/20 bg-blue-50/40 shadow-md'
                    : 'border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-gray-300'
                }`}
              >
                {p.imageUrl ? (
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <ServiceIcon className="h-9 w-9 text-muted-foreground" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{p.name}</span>
                    {isPopular && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        Más popular
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${meta.chip}`}>
                      <ServiceIcon className="h-3 w-3" /> {meta.label}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900">{formatPrice(p)}</span>
                    <span className="text-sm text-foreground0">/{p.interval === 'monthly' ? 'mes' : 'año'}</span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground0">
                    {p.services !== 'tv' && (
                      <span className="inline-flex items-center gap-1">
                        <HardDrive className="h-3 w-3 text-brand" /> Radio: {fmtMB(p.radioStorageQuotaMB)}
                      </span>
                    )}
                    {p.services !== 'radio' && (
                      <span className="inline-flex items-center gap-1">
                        <HardDrive className="h-3 w-3 text-purple-500" /> TV: {fmtMB(p.videoStorageQuotaMB)}
                      </span>
                    )}
                  </div>

                  {p.features.length > 0 && (
                    <ul className="mt-2.5 space-y-1">
                      {p.features.slice(0, 4).map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="shrink-0 self-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-brand' : 'border-gray-300'}`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-brand" />}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
      )}

      {/* ===== FORMULARIO ===== */}
      <div className={isFixed ? '' : 'lg:sticky lg:top-8'}>
        <form data-slot="card" onSubmit={submit} className="rounded-2xl border border-gray-200 bg-white p-7 shadow-lg space-y-5">
          <div>
            <h3 data-slot="heading" className="text-xl font-bold text-gray-900">Crea tu cuenta</h3>
            {selected ? (
              <p data-slot="sub" className="mt-1 text-sm text-foreground0">
                Plan <span data-slot="accent" className="text-brand font-medium">{selected.name}</span> · {formatPrice(selected)}/{selected.interval === 'monthly' ? 'mes' : 'año'}
              </p>
            ) : (
              <p data-slot="sub" className="mt-1 text-sm text-foreground0">Completa tus datos para comenzar</p>
            )}
          </div>

          {trialDays > 0 && (
            <div data-slot="trial" className="flex items-center gap-2 rounded-xl bg-cyan-50 border border-cyan-200 px-3 py-2 text-sm text-brand">
              <Sparkles className="h-4 w-4 text-brand" />
              Incluye <strong>{trialDays} días de prueba gratis</strong>. Después pagas el plan que elijas.
            </div>
          )}

          <div className="space-y-3">
            <div className="relative">
              <User data-slot="icon" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                data-slot="input"
                className="w-full rounded-xl bg-gray-50 border border-gray-300 text-gray-900 pl-9 pr-3 py-2.5 text-sm placeholder-gray-400 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-colors"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre completo"
                required
              />
            </div>
            <div className="relative">
              <Radio data-slot="icon" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                data-slot="input"
                className="w-full rounded-xl bg-gray-50 border border-gray-300 text-gray-900 pl-9 pr-3 py-2.5 text-sm placeholder-gray-400 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-colors"
                value={radioName}
                onChange={(e) => setRadioName(e.target.value)}
                placeholder="Nombre de la radio"
                required
              />
            </div>
            {radioName.trim() && (
              <p className="text-xs px-1 -mt-1">
                {slugStatus === 'checking' && <span className="text-muted-foreground">Verificando disponibilidad…</span>}
                {slugStatus === 'available' && (
                  <span className="text-green-600">✓ Disponible: <strong>{siteHost}</strong></span>
                )}
                {slugStatus === 'taken' && <span className="text-red-600">✗ {siteHost || 'Ese nombre'} ya está en uso</span>}
                {slugStatus === 'reserved' && <span className="text-red-600">✗ Ese nombre está reservado</span>}
                {slugStatus === 'invalid' && <span className="text-muted-foreground">Escribe al menos 2 letras</span>}
              </p>
            )}
            <div className="relative">
              <Mail data-slot="icon" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                data-slot="input"
                className="w-full rounded-xl bg-gray-50 border border-gray-300 text-gray-900 pl-9 pr-3 py-2.5 text-sm placeholder-gray-400 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-colors"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.cl"
                required
              />
            </div>
            <div className="relative">
              <Lock data-slot="icon" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                data-slot="input"
                className="w-full rounded-xl bg-gray-50 border border-gray-300 text-gray-900 pl-9 pr-3 py-2.5 text-sm placeholder-gray-400 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-colors"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña (mínimo 6 caracteres)"
                required
                minLength={6}
              />
            </div>
          </div>

          {error && <p data-slot="error" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <button
            data-slot="submit"
            type="submit"
            disabled={loading || plans.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand hover:bg-brand disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold shadow-lg shadow-blue-600/20 transition-all"
          >
            {loading ? 'Creando cuenta...' : (
              <>
                Crear mi cuenta <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div data-slot="shield" className="flex items-center justify-center gap-1.5 text-xs text-foreground0">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Tus datos están protegidos.
          </div>

          <p data-slot="prompt" className="text-center text-sm text-foreground0">
            ¿Ya tienes cuenta?{' '}
            <Link data-slot="link" href="/auth/login" className="text-brand hover:text-brand font-medium hover:underline">Inicia sesión</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
