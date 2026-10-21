'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PanelLogo } from '@/components/ui/PanelLogo'

interface LoginFormProps {
  backgroundImage: string | null
}

export default function LoginPage({ backgroundImage }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Credenciales inválidas')
      } else {
        const session = await getSession()
        if (session?.user.role === 'ADMIN') {
          router.push('/admin')
        } else {
          router.push('/dashboard')
        }
      }
    } catch (error) {
      setError('Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background lg:grid lg:grid-cols-2">
      {/* Fondo: imagen configurada por el admin, o un glow de marca sutil */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {backgroundImage ? (
          <>
            <img
              src={backgroundImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/70"></div>
          </>
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(900px 460px at 50% -10%, rgba(40,180,240,0.16), transparent 70%)' }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(700px 420px at 85% 110%, rgba(0,80,180,0.14), transparent 70%)' }}
            />
          </>
        )}
      </div>

      {/* La mitad izquierda queda libre para mostrar el fondo */}
      <div className="relative hidden lg:block" aria-hidden="true" />

      {/* Panel de acceso: ocupa todo el lado derecho */}
      <section className="relative z-10 flex max-h-[100dvh] min-h-[100dvh] w-full flex-col justify-center overflow-y-auto border-border/60 bg-background/80 px-5 py-10 backdrop-blur-xl sm:px-8 lg:border-l lg:px-12 xl:px-20">
        <div className="mx-auto w-full max-w-[520px]">
          <div className="mb-10 flex justify-center">
            <PanelLogo className="h-20 w-auto" />
          </div>
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-foreground">Iniciar Sesión</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Accede a tu panel de gestión de radio
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="form-input"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="form-label">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50"
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  )
}
