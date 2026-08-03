import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PlusIcon } from '@heroicons/react/24/outline'
import { PromotionsList } from '@/components/dashboard/PromotionsList'

export default async function PromotionsPage() {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'promotions')
      if (!allowed) redirect('/dashboard')
    }
  }

  const session = await getServerSession(authOptions)
  
  if (!session?.user.clientId) {
    return <div>Error: No se encontró información del cliente</div>
  }

  const promotions = await prisma.promotion.findMany({
    where: { clientId: session.user.clientId },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Promociones
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona las promociones y ofertas de tu radio
          </p>
        </div>
        <Link
          href="/dashboard/promotions/new"
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Nueva Promoción
        </Link>
      </div>

      <PromotionsList promotions={promotions} />
    </div>
  )
}