'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Check, Radio, MonitorPlay, HardDrive, ArrowRight,
  CheckCircle2, User, Mail, Lock, ShieldCheck, Clapperboard,
} from 'lucide-react'

export interface PublicPlan {
  id: string
  name: string
  price: number
  currency: string
  interval: string
  features: string[]
  maxDjs: number
  services: string
  radioStorageQuotaMB: number | null
  videoStorageQuotaMB: number | null
  imageUrl: string | null
}

const SERVICES_META: Record<string, { label: string; icon: any }> = {
  radio: { label: 'Radio', icon: Radio },
  tv: { label: 'TV', icon: MonitorPlay },
  both: { label: 'Radio + TV', icon: Clapperboard },
}

export function SignupForm({ plans, preselect }: { plans: PublicPlan[]; preselect?: string }) {
  const initial = plans.find((p) => p.name === preselect || p.id === preselect)?.id || plans[0]?.id || ''
  const [planId, setPlanId] = useState<string>(initial)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const selected = plans.find((p) => p.id === planId) || null
  const formatPrice = (p: PublicPlan) =>
    p.currency === 'CLP'
      ? `$${Math.round(p.price).toLocaleString('es-CL')}`
      : `${p.currency} ${p.price.toLocaleString('es-CL')}`
  const fmtMB = (mb: number | null) =>
    mb ? `${mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : mb + ' MB'}` : 'Ilimitado'

  const popularId = (() => {
    const sorted = [...plans].sort((a, b) => a.price - b.price)
    if (sorted.length <= 1) return null
    return sorted[Math.floor((sorted.length - 1) / 2)].id
  })()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!planId) {
      setError('Elegí un plan')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, planId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Error al registrarte. Intentá de nuevo.')
        return
      }
      setDone(true)
    } catch {
      setError('Error al registrarte. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center space-y-5 py-12">
        <div className="mx-auto w-16 h-16 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-cyan-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">¡Tu cuenta está lista!</h2>
        <p className="text-gray-300">
          Te enviamos la boleta del mes por correo. Cuando se confirme el pago, tu plan queda activo y podés
          empezar a transmitir.
        </p>
        {selected && (
          <div className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-200">
            Plan <span className="font-semibold text-cyan-300">{selected.name}</span> · {formatPrice(selected)}/
            {selected.interval === 'monthly' ? 'mes' : 'año'}
          </div>
        )}
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors"
        >
          Iniciar sesión <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {/* ===== PLANES (izquierda) ===== */}
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-white">Elegí tu plan</h2>
          <p className="text-sm text-gray-400 mt-1">Precios simples, sin permanencia.</p>
        </div>

        {plans.length === 0 ? (
          <p className="text-gray-500 text-sm">Los planes estarán disponibles próximamente.</p>
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
                className={`w-full text-left flex gap-4 rounded-xl border p-4 transition-colors ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-500/5'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                }`}
              >
                {p.imageUrl ? (
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-800 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                    <ServiceIcon className="h-8 w-8 text-gray-500" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">{p.name}</span>
                    {isPopular && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">
                        Más popular
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                      <ServiceIcon className="h-3 w-3" /> {meta.label}
                    </span>
                  </div>

                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold text-white">{formatPrice(p)}</span>
                    <span className="text-xs text-gray-400">/{p.interval === 'monthly' ? 'mes' : 'año'}</span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <HardDrive className="h-3 w-3" /> Radio: {fmtMB(p.radioStorageQuotaMB)}
                    </span>
                    {p.services !== 'radio' && (
                      <span className="inline-flex items-center gap-1">
                        <HardDrive className="h-3 w-3" /> TV: {fmtMB(p.videoStorageQuotaMB)}
                      </span>
                    )}
                  </div>

                  <ul className="mt-2 space-y-1">
                    {p.features.slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-gray-300">
                        <Check className="h-3.5 w-3.5 text-cyan-400 mt-0.5 shrink-0" />
                        <span className="truncate">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="shrink-0 self-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-cyan-500' : 'border-gray-600'}`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* ===== FORMULARIO (derecha) ===== */}
      <div className="lg:sticky lg:top-8">
        <form
          onSubmit={submit}
          className="rounded-xl border border-gray-700 bg-gray-900 p-6 space-y-5"
        >
          <div>
            <h3 className="text-lg font-bold text-white">Creá tu cuenta</h3>
            {selected ? (
              <p className="mt-1 text-sm text-gray-400">
                Plan <span className="text-cyan-300 font-medium">{selected.name}</span> · {formatPrice(selected)}/
                {selected.interval === 'monthly' ? 'mes' : 'año'}
              </p>
            ) : (
              <p className="mt-1 text-sm text-gray-400">Completá tus datos para comenzar</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white pl-9 pr-3 py-2.5 text-sm placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre completo"
                required
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white pl-9 pr-3 py-2.5 text-sm placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.cl"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white pl-9 pr-3 py-2.5 text-sm placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña (mínimo 6 caracteres)"
                required
                minLength={6}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || plans.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            {loading ? 'Creando cuenta...' : (
              <>
                Crear mi cuenta <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-500" />
            Tus datos están protegidos.
          </div>

          <p className="text-center text-sm text-gray-400">
            ¿Ya tenés cuenta?{' '}
            <Link href="/auth/login" className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline">
              Iniciá sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
