'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

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
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-background">
      {/* Fondo: imagen configurada por el admin, o un glow de marca sutil */}
      <div className="absolute inset-0 overflow-hidden">
        {backgroundImage ? (
          <>
            <img
              src={backgroundImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
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

      {/* Tarjeta de login */}
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="card">
          <div className="flex justify-center mb-8">
            <img
              src="/logo-ipstream.png"
              alt="IPStream Panel"
              className="h-20 w-auto"
            />
          </div>
          <h2 className="text-center text-3xl font-bold text-foreground mb-2">
            Iniciar Sesión
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-8">
            Accede a tu panel de gestión de radio
          </p>

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
      </div>

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
