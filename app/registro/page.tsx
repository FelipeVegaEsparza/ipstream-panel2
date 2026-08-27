import { prisma } from '@/lib/prisma'
import { SignupForm, PublicPlan } from '@/components/public/SignupForm'
import { Radio, MonitorPlay, CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: { plan?: string }
}) {
  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } })

  const parsedPlans: PublicPlan[] = plans.map((p) => {
    let features: string[] = []
    try {
      const f = JSON.parse(p.features)
      if (Array.isArray(f)) features = f.filter((x) => typeof x === 'string').slice(0, 6)
    } catch {}
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      interval: p.interval,
      features,
      maxDjs: p.maxDjs,
      services: p.services || 'both',
      radioStorageQuotaMB: p.radioStorageQuotaMB,
      videoStorageQuotaMB: p.videoStorageQuotaMB,
    }
  })

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0d16] text-white">
      {/* Glows de fondo */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-cyan-500/15 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 w-[450px] h-[450px] rounded-full bg-blue-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-[120px]" />

      <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-16">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <img src="/logo-ipstream.png" alt="IPStream" className="h-10 w-auto" />
          <a
            href="https://ipstream.cl"
            className="text-sm text-gray-300 hover:text-white transition-colors"
          >
            ← Volver a ipstream.cl
          </a>
        </header>

        {/* Hero */}
        <section className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-300 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            Transmisión de radio y televisión en la nube
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Tu radio y TV,{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              al aire en minutos
            </span>
          </h1>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto text-lg">
            Creá tu cuenta, elegí tu plan y empezá a transmitir con AutoDJ, DJs en vivo, parrillas y mucho más.
          </p>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-300">
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-400" /> Sin permanencia</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-400" /> Activación inmediata</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-400" /> Soporte dedicado</span>
          </div>
        </section>

        {/* Contenido (planes + formulario) */}
        <SignupForm plans={parsedPlans} preselect={searchParams.plan} />

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/5 text-center text-xs text-gray-500 space-y-2">
          <p>IPStream · Radio y Televisión por streaming</p>
          <p>
            Al crear tu cuenta aceptás nuestros{' '}
            <a href="#" className="text-gray-400 hover:text-cyan-400">Términos y Condiciones</a> y{' '}
            <a href="#" className="text-gray-400 hover:text-cyan-400">Política de Privacidad</a>.
          </p>
        </footer>
      </div>
    </div>
  )
}
