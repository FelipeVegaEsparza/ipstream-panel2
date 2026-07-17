import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { MenuConfig, type MenuConfigItem } from '@/components/admin/MenuConfig'
import { MENU_ITEMS, type MenuItemKey } from '@/lib/menu-items'

interface MenuPageProps {
  params: { id: string }
}

export default async function ClientMenuPage({ params }: MenuPageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div className="text-red-400 p-6">Acceso no autorizado</div>
  }

  // La URL es /admin/users/[id] donde [id] es el userId (no el clientId).
  // Buscamos al usuario y a su cliente asociado.
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { client: true },
  })

  if (!user || !user.client) {
    notFound()
  }

  const client = user.client
  const overrides = await prisma.clientMenuItem.findMany({
    where: { clientId: client.id },
    select: { itemKey: true, enabled: true },
  })

  const initialItems: MenuConfigItem[] = MENU_ITEMS.map((item) => {
    const override = overrides.find((o) => o.itemKey === item.key)
    return {
      key: item.key,
      enabled: override ? override.enabled : true,
    }
  })

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/admin/users/${user.id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Volver a {client.name}
        </Link>
        <div className="flex items-center gap-3">
          <Cog6ToothIcon className="h-8 w-8 text-cyan-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Menú visible</h1>
            <p className="text-gray-400">
              Configura qué secciones del panel puede ver{' '}
              <span className="text-white font-medium">{client.name}</span>
              {' '}({user.email})
            </p>
          </div>
        </div>
      </div>

      <div className="card max-w-3xl">
        <MenuConfig clientId={client.id} initialItems={initialItems} />
      </div>
    </div>
  )
}
