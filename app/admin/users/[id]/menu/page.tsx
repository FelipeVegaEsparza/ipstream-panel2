import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { MenuConfig, type MenuConfigItem } from '@/components/admin/MenuConfig'
import { MENU_ITEMS, type MenuItemKey } from '@/lib/menu-items'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

interface MenuPageProps {
  params: { id: string }
}

export default async function ClientMenuPage({ params }: MenuPageProps) {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div className="text-red-400 p-6">{t('admin.accessDeniedShort')}</div>
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

  const initialItems: MenuConfigItem[] = MENU_ITEMS.flatMap((item) => {
    const override = (k: MenuItemKey) => overrides.find((o) => o.itemKey === k)
    const parent = { key: item.key, enabled: override(item.key) ? override(item.key)!.enabled : true }
    if (item.children) {
      return [
        parent,
        ...item.children.map((c) => ({
          key: c.key,
          enabled: override(c.key) ? override(c.key)!.enabled : true,
        })),
      ]
    }
    return [parent]
  })

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/admin/users/${user.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand transition-colors mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t('admin.users.menu.backTo', { name: client.name })}
        </Link>
        <div className="flex items-center gap-3">
          <Cog6ToothIcon className="h-8 w-8 text-brand" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('admin.users.menu.title')}</h1>
            <p className="text-muted-foreground">
              {t('admin.users.menu.subtitle', { name: client.name, email: user.email })}
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
