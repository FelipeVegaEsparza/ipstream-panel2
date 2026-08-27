import { prisma } from '@/lib/prisma'
import { SignupForm, PublicPlan } from '@/components/public/SignupForm'

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
      imageUrl: p.imageUrl,
    }
  })

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white">
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <img src="/logo-ipstream.png" alt="IPStream" className="h-9 w-auto" />
          <a href="https://ipstream.cl" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Volver a ipstream.cl
          </a>
        </header>

        {/* Título */}
        <section className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Creá tu cuenta</h1>
          <p className="mt-2 text-gray-400 max-w-xl">
            Elegí un plan y empezá a transmitir tu radio y televisión. Sin permanencia, activación inmediata.
          </p>
        </section>

        {/* Dos columnas: planes + formulario */}
        <SignupForm plans={parsedPlans} preselect={searchParams.plan} />

        {/* Footer */}
        <footer className="mt-14 pt-6 border-t border-white/10 text-center text-xs text-gray-500 space-y-1.5">
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
