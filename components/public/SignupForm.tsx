'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Check } from 'lucide-react'

export interface PublicPlan {
  id: string
  name: string
  price: number
  currency: string
  interval: string
  features: string[]
  maxDjs: number
  services: string
}

const SERVICES_LABEL: Record<string, string> = { radio: 'Solo Radio', tv: 'Solo TV', both: 'Radio + TV' }

export function SignupForm({ plans, preselect }: { plans: PublicPlan[]; preselect?: string }) {
  const [planId, setPlanId] = useState<string>(
    plans.find((p) => p.name === preselect || p.id === preselect)?.id || plans[0]?.id || ''
  )
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const currencySymbol = (c: string) => (c === 'CLP' ? '$' : c === 'USD' ? 'US$' : c)
  const formatPrice = (p: PublicPlan) =>
    p.currency === 'CLP'
      ? `$${Math.round(p.price).toLocaleString('es-CL')}`
      : `${currencySymbol(p.currency)}${p.price.toLocaleString('es-CL')}`

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
      <div className="max-w-md mx-auto text-center space-y-4 py-10">
        <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
          <CheckCircle className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">¡Cuenta creada!</h2>
        <p className="text-gray-300">
          Tu cuenta quedó lista. Te enviamos la boleta del mes por correo. Cuando el pago se confirme, tu
          plan queda activo.
        </p>
        <Link href="/auth/login" className="inline-block px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium">
          Iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-gray-400 text-sm">Elegí tu plan y creá tu cuenta en un minuto.</p>

      {/* Planes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const selected = planId === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlanId(p.id)}
              className={`text-left rounded-2xl border p-5 transition-colors ${
                selected
                  ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500'
                  : 'border-gray-700 bg-gray-800/60 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white">{p.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                  selected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-gray-700 text-gray-400'
                }`}>
                  {SERVICES_LABEL[p.services] || 'Radio + TV'}
                </span>
              </div>
              <div className="text-2xl font-bold text-white">
                {formatPrice(p)}
                <span className="text-sm text-gray-400 font-normal"> / {p.interval === 'monthly' ? 'mes' : 'año'}</span>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-gray-400">
                {p.features.slice(0, 5).map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <Check className="h-3 w-3 text-cyan-400 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      {/* Form */}
      <form onSubmit={submit} className="space-y-4 max-w-md">
        <div className="form-group">
          <label className="form-label">Nombre completo</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Juan Pérez" />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@correo.cl" />
        </div>
        <div className="form-group">
          <label className="form-label">Contraseña</label>
          <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg font-semibold"
        >
          {loading ? 'Creando cuenta...' : 'Crear mi cuenta'}
        </button>
        <p className="text-xs text-gray-500 text-center">
          Ya tenés cuenta? <Link href="/auth/login" className="text-cyan-400 hover:underline">Iniciá sesión</Link>
        </p>
      </form>
    </div>
  )
}
