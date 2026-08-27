'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Check, Radio, MonitorPlay, HardDrive, Sparkles, ArrowRight,
  CheckCircle2, User, Mail, Lock, ShieldCheck, Headphones, Clapperboard,
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
}

const SERVICES_META: Record<string, { label: string; icon: any; color: string }> = {
  radio: { label: 'Radio', icon: Radio, color: 'text-cyan-400' },
  tv: { label: 'TV', icon: MonitorPlay, color: 'text-purple-400' },
  both: { label: 'Radio + TV', icon: Clapperboard, color: 'text-cyan-400' },
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
  const currencySymbol = (c: string) => (c === 'CLP' ? '$' : c === 'USD' ? 'US$' : `${c} `)
  const formatPrice = (p: PublicPlan) =>
    p.currency === 'CLP'
      ? `$${Math.round(p.price).toLocaleString('es-CL')}`
      : `${currencySymbol(p.currency)}${p.price.toLocaleString('es-CL')}`
  const fmtMB = (label: string, mb: number | null) =>
    mb ? `${mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : mb + ' MB'}` : 'Ilimitado'

  // Plan "más popular": el de precio intermedio (o el más caro si son 1-2)
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
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-cyan-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white">¡Tu cuenta está lista!</h2>
        <p className="text-gray-300">
          Te enviamos la boleta del mes por correo. Cuando se confirme el pago, tu plan queda activo y podés
          empezar a transmitir.
        </p>
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-200">
          Plan seleccionado: <span className="font-semibold text-cyan-300">{selected?.name}</span> ·{' '}
          {selected && formatPrice(selected)}/{selected?.interval === 'monthly' ? 'mes' : 'año'}
        </div>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold shadow-lg shadow-cyan-500/20 transition-all"
        >
          Iniciar sesión <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* ===== PLANES ===== */}
      <div>
        <div className="text-center mb-8">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-cyan-400">
            <Sparkles className="h-3.5 w-3.5" /> Elige tu plan
          </p>
          <h2 className="mt-2 text-2xl md:text-3xl font-bold text-white">Precios simples y claros</h2>
          <p className="mt-2 text-gray-400 max-w-xl mx-auto">
            Transmití tu radio y/o televisión con todo lo que necesitás. Sin costos ocultos, podés cambiar de plan
            cuando quieras.
          </p>
        </div>

        {plans.length === 0 ? (
          <p className="text-center text-gray-500">Los planes estarán disponibles próximamente.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {plans.map((p) => {
              const isSelected = planId === p.id
              const isPopular = p.id === popularId
              const meta = SERVICES_META[p.services] || SERVICES_META.both
              const ServiceIcon = meta.icon
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanId(p.id)}
                  className={`relative text-left rounded-2xl p-6 transition-all duration-200 ${
                    isSelected
                      ? 'bg-gradient-to-b from-cyan-500/10 to-transparent border-2 border-cyan-500 shadow-lg shadow-cyan-500/10 -translate-y-1'
                      : 'bg-gray-900/60 border border-gray-700 hover:border-gray-500 hover:-translate-y-0.5'
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow">
                      <Sparkles className="h-3 w-3" /> Más popular
                    </span>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-lg">{p.name}</span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-white/5 text-gray-200`}>
                      <ServiceIcon className={`h-3.5 w-3.5 ${meta.color}`} />
                      {meta.label}
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{formatPrice(p)}</span>
                    <span className="text-sm text-gray-400">/{p.interval === 'monthly' ? 'mes' : 'año'}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-300">
                      <HardDrive className="h-3 w-3" /> {fmtMB('radio', p.radioStorageQuotaMB)}
                    </span>
                    {p.services !== 'radio' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 text-purple-300">
                        <HardDrive className="h-3 w-3" /> {fmtMB('video', p.videoStorageQuotaMB)}
                      </span>
                    )}
                  </div>

                  <ul className="mt-4 space-y-2">
                    {p.features.slice(0, 6).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <Check className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className={`mt-5 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                    isSelected
                      ? 'bg-cyan-500 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}>
                    {isSelected ? 'Seleccionado' : 'Elegir plan'}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ===== FORMULARIO ===== */}
      <form
        onSubmit={submit}
        className="max-w-md mx-auto rounded-2xl border border-gray-700 bg-gray-900/60 p-6 md:p-8 space-y-5 shadow-2xl"
      >
        <div className="text-center">
          <h3 className="text-xl font-bold text-white">Creá tu cuenta</h3>
          {selected ? (
            <p className="mt-1 text-sm text-gray-400">
              Plan <span className="text-cyan-300 font-medium">{selected.name}</span> · {formatPrice(selected)}/
              {selected.interval === 'monthly' ? 'mes' : 'año'}
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-400">Completá tus datos para comenzar</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              className="w-full rounded-xl bg-gray-800 border border-gray-600 text-white pl-10 pr-4 py-3 text-sm placeholder-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre completo"
              required
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              className="w-full rounded-xl bg-gray-800 border border-gray-600 text-white pl-10 pr-4 py-3 text-sm placeholder-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.cl"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              className="w-full rounded-xl bg-gray-800 border border-gray-600 text-white pl-10 pr-4 py-3 text-sm placeholder-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all"
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
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold shadow-lg shadow-cyan-500/20 transition-all"
        >
          {loading ? 'Creando cuenta...' : (
            <>
              Crear mi cuenta <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
          <ShieldCheck className="h-3.5 w-3.5 text-cyan-500" />
          Tus datos están protegidos y nunca se comparten.
        </div>

        <p className="text-center text-sm text-gray-400">
          ¿Ya tenés cuenta?{' '}
          <Link href="/auth/login" className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </form>

      {/* ===== TRUST ===== */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {[
          { icon: Radio, title: 'Radio en vivo', desc: 'AutoDJ, playlists y DJs en tiempo real.' },
          { icon: MonitorPlay, title: 'Televisión', desc: 'Streaming de video con ingesta OBS.' },
          { icon: Headphones, title: 'Soporte', desc: 'Te acompañamos en cada paso del camino.' },
        ].map((f, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-gray-700/60 bg-gray-900/40 p-4">
            <f.icon className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">{f.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
