import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PlusIcon } from '@heroicons/react/24/outline'
import { GalleriesList } from '@/components/dashboard/GalleriesList'

export default async function GalleriesPage() {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'galleries')
      if (!allowed) redirect('/dashboard')
    }
  }

  const session = await getServerSession(authOptions)

  if (!session?.user.clientId) {
    return <div>Error: No se encontró información del cliente</div>
  }

  const galleries = await prisma.gallery.findMany({
    where: { clientId: session.user.clientId },
    include: {
      images: {
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Galerías</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona las galerías de imágenes de tu radio
          </p>
        </div>
        <Link
          href="/dashboard/galleries/new"
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Nueva Galería
        </Link>
      </div>

      <GalleriesList galleries={galleries} />
    </div>
  )
}
