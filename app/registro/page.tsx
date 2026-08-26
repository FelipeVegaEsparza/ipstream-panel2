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
    }
  })

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <img src="/logo-ipstream.png" alt="IPStream" className="h-14 w-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">Creá tu cuenta</h1>
          <p className="text-gray-400 mt-2">Elegí un plan y empezá a transmitir radio y TV.</p>
        </div>
        <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-6 md:p-8 shadow-2xl">
          <SignupForm plans={parsedPlans} preselect={searchParams.plan} />
        </div>
      </div>
    </div>
  )
}
