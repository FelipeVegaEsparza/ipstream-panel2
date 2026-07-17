import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TutorialsView } from './TutorialsView'

export const dynamic = 'force-dynamic'

export default async function TutorialsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const [categories, tutorials] = await Promise.all([
    prisma.tutorialCategory.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.tutorial.findMany({
      where: { isPublished: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        description: true,
        youtubeUrl: true,
        categoryId: true,
        order: true,
      },
    }),
  ])

  return (
    <TutorialsView
      initialCategories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        order: c.order,
      }))}
      initialTutorials={tutorials}
    />
  )
}
