import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CategoriesManager } from './CategoriesManager'

export const dynamic = 'force-dynamic'

export default async function TutorialCategoriesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div className="text-red-400 p-6">Acceso no autorizado</div>
  }

  const categories = await prisma.tutorialCategory.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { tutorials: true } } },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Categorías de tutoriales</h1>
        <p className="text-gray-400 mt-1">
          Crea categorías para organizar los tutoriales de la plataforma
        </p>
      </div>
      <CategoriesManager initialCategories={categories} />
    </div>
  )
}
