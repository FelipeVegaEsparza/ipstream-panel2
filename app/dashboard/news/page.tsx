import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PlusIcon } from '@heroicons/react/24/outline'
import { NewsList } from '@/components/dashboard/NewsList'
import { GenericNewsSelector } from '@/components/dashboard/GenericNewsSelector'

export default async function NewsPage() {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'news')
      if (!allowed) redirect('/dashboard')
    }
  }

  const session = await getServerSession(authOptions)
  
  if (!session?.user.clientId) {
    return <div>Error: No se encontró información del cliente</div>
  }

  const client = await prisma.client.findUnique({
    where: { id: session.user.clientId },
    include: {
      genericCategories: {
        select: { id: true, name: true, slug: true }
      }
    }
  })

  const config = await prisma.appConfig.findFirst()
  const enableGenericNews = config?.enableGenericNews ?? false
  const useGenericNews = client?.useGenericNews ?? false
  const selectedCategories = client?.genericCategories ?? []

  const allCategories = enableGenericNews ? await prisma.globalNewsCategory.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' }
  }) : []

  const news = useGenericNews ? [] : await prisma.news.findMany({
    where: { clientId: session.user.clientId },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Noticias
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {useGenericNews
              ? 'Estás usando noticias genéricas del sistema'
              : 'Gestiona las noticias de tu radio'}
          </p>
        </div>
        {!useGenericNews && (
          <Link
            href="/dashboard/news/new"
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Nueva Noticia
          </Link>
        )}
      </div>

      {enableGenericNews && (
        <GenericNewsSelector
          useGenericNews={useGenericNews}
          selectedCategories={selectedCategories}
          allCategories={allCategories}
        />
      )}

      {useGenericNews ? (
        <div className="card p-6">
          <p className="text-gray-600">
            Las noticias que se muestran en tu sitio web son proporcionadas por el sistema.
            Puedes seleccionar las categorías que deseas mostrar en la sección de configuración superior.
          </p>
        </div>
      ) : (
        <NewsList news={news} />
      )}
    </div>
  )
}
