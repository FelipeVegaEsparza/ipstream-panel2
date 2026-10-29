import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { SponsorForm } from '@/components/dashboard/SponsorForm'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

interface EditSponsorPageProps {
  params: {
    id: string
  }
}

export default async function EditSponsorPage({ params }: EditSponsorPageProps) {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)
  
  if (!session?.user.clientId) {
    return <div>{t('news.noClient')}</div>
  }

  const sponsor = await prisma.sponsor.findFirst({
    where: {
      id: params.id,
      clientId: session.user.clientId,
    }
  })

  if (!sponsor) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
    <h1 className="text-2xl font-bold text-foreground">
          {t('sponsors.edit')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('sponsors.editSubtitleActual')}
        </p>
      </div>

      <div className="card max-w-4xl">
        <SponsorForm initialData={sponsor} />
      </div>
    </div>
  )
}