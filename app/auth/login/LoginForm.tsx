'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PanelLogo } from '@/components/ui/PanelLogo'

interface LoginFormProps {
  backgroundMedia: string | null
  backgroundIsVideo: boolean
  callbackUrl?: string | null
}

export default function LoginPage({
  backgroundMedia,
  backgroundIsVideo,
  callbackUrl = null,
}: LoginFormProps) {
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
        const safeCallback =
          callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
            ? callbackUrl
            : null
        if (session?.user.role === 'ADMIN') {
          router.push(safeCallback?.startsWith('/admin') ? safeCallback : '/admin')
        } else {
          router.push(safeCallback || '/dashboard')
        }
      }
    } catch (error) {
      setError('Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background lg:grid lg:grid-cols-[3fr_2fr]">
      {/* Fondo: media configurada o composición de control room */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {backgroundMedia ? (
          <>
            {backgroundIsVideo ? (
              <video
                src={backgroundMedia}
                className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
            ) : (
              <img
                src={backgroundMedia}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/60" />
          </>
        ) : (
          <div className="absolute inset-0 bg-surface-0">
            <div className="absolute inset-x-8 top-8 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
              <span>CasterFly</span>
              <span>Control Room</span>
            </div>
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2">
              <p className="text-[10px] font-medium text-muted-foreground">Radio · TV · IA</p>
              <p className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight text-foreground">
                Control
                <br />
                Room
              </p>
              <div className="mt-6 h-px w-full bg-line" />
              <p className="mt-3 max-w-xs text-[11px] leading-5 text-muted-foreground">
                Una consola para operar tu emisora, tu televisión y tu contenido desde un solo lugar.
              </p>
            </div>
            <div className="absolute inset-x-8 bottom-8 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--live)]" />
                Sistema operativo
              </span>
              <span>Acceso seguro</span>
            </div>
          </div>
        )}
      </div>

      {/* Panel de acceso */}
      <div className="relative hidden lg:block" aria-hidden="true" />

      <section className="relative z-10 flex max-h-[100dvh] min-h-[100dvh] w-full flex-col justify-center overflow-y-auto border-line bg-background px-6 py-10 sm:px-10 lg:border-l lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-[420px]">
          <PanelLogo className="h-8 w-auto" />

          <div className="mt-10 border-b border-line pb-6">
            <p className="text-[11px] font-medium text-muted-foreground">Acceso al panel</p>
            <h2 className="mt-1 text-[24px] font-semibold tracking-tight text-foreground">
              Iniciar sesión
            </h2>
            <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
              Accede a la operación de tu radio y televisión.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-start gap-2 border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-3 py-2.5 text-[12px] text-danger">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--danger)]" />
                {error}
              </div>
            )}

            <div className="space-y-2">
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

            <div className="space-y-2">
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

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-between border-t border-line pt-4 text-[10px] text-muted-foreground">
            <span>Panel de operación</span>
            <span>Acceso seguro</span>
          </div>

          <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
            Si acabas de registrarte, tu cuenta puede estar pendiente de activación. Te avisaremos por correo cuando esté lista.
          </p>
        </div>
      </section>
    </div>
  )
}
