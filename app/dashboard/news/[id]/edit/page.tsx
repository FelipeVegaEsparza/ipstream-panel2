import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { NewsForm } from '@/components/dashboard/NewsForm'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

interface EditNewsPageProps {
  params: {
    id: string
  }
}

export default async function EditNewsPage({ params }: EditNewsPageProps) {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)
  
  if (!session?.user.clientId) {
    return <div>{t('news.noClient')}</div>
  }

  const news = await prisma.news.findFirst({
    where: {
      id: params.id,
      clientId: session.user.clientId,
    }
  })

  if (!news) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('news.editPage.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('news.editPage.subtitle')}
        </p>
      </div>

      <div className="card max-w-4xl">
        <NewsForm initialData={news} />
      </div>
    </div>
  )
}