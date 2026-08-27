import { prisma } from '@/lib/prisma'
import { SignupForm, PublicPlan } from '@/components/public/SignupForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Crear cuenta | IPStream - Tu Radio Online',
}

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
    <div className="min-h-screen bg-gray-50 text-gray-900" style={{ fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="https://ipstream.cl" className="flex items-center">
            <img src="https://ipstream.cl/images/logos/logo.png" alt="IPStream" className="h-11 w-auto" />
          </a>
          <nav className="flex items-center gap-5">
            <a href="https://ipstream.cl/planes" className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors hidden sm:inline">Planes</a>
            <a href="https://ipstream.cl/caracteristicas" className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors hidden sm:inline">Características</a>
            <a
              href="https://ipstream.cl/landing"
              className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all"
            >
              Quiero Contratar
            </a>
          </nav>
        </div>
      </header>

      {/* Título */}
      <section className="max-w-5xl mx-auto px-4 pt-10 pb-8 text-center">
        <span className="inline-block py-1 px-3 rounded-full bg-blue-100 text-blue-600 text-sm font-medium mb-4">
          CREA TU CUENTA
        </span>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Elegí tu plan y empezá a <span className="text-blue-600">transmitir</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Sitio web profesional, reproductor, app PWA y panel de administración para tu radio o televisión.
        </p>
      </section>

      {/* Dos columnas */}
      <div className="max-w-5xl mx-auto px-4 pb-14">
        <SignupForm plans={parsedPlans} preselect={searchParams.plan} />
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-gray-500 space-y-1.5">
          <p>© {new Date().getFullYear()} IPStream · Radio Online y Televisión por streaming</p>
          <p>
            Al crear tu cuenta aceptás nuestros{' '}
            <a href="#" className="text-blue-600 hover:underline">Términos y Condiciones</a> y{' '}
            <a href="#" className="text-blue-600 hover:underline">Política de Privacidad</a>.
          </p>
        </div>
      </footer>
    </div>
  )
}
