import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { PromotionForm } from '@/components/dashboard/PromotionForm'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

interface EditPromotionPageProps {
  params: {
    id: string
  }
}

export default async function EditPromotionPage({ params }: EditPromotionPageProps) {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)
  
  if (!session?.user.clientId) {
    return <div>{t('news.noClient')}</div>
  }

  const promotion = await prisma.promotion.findFirst({
    where: {
      id: params.id,
      clientId: session.user.clientId,
    }
  })

  if (!promotion) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
    <h1 className="text-2xl font-bold text-foreground">
          {t('promotions.edit')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('promotions.editSubtitle')}
        </p>
      </div>

      <div className="card max-w-2xl">
        <PromotionForm initialData={promotion} />
      </div>
    </div>
  )
}