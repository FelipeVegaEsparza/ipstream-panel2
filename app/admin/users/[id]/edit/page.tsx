import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { UserForm } from '@/components/admin/UserForm'
import { DomainManager } from '@/components/admin/DomainManager'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

interface EditUserPageProps {
  params: {
    id: string
  }
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>{t('admin.accessDenied')}</div>
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      client: {
        include: {
          plan: true,
          basicData: { select: { websiteUrl: true } },
        }
      }
    }
  })

  if (!user) {
    notFound()
  }

  // Transform data to match UserForm expected structure
  const formData = {
    id: user.id,
    name: user.name,
    email: user.email,
    client: user.client ? {
      id: user.client.id,
      name: user.client.name,
      plan: user.client.plan?.name || t('admin.users.noPlan'),
      phone: user.client.phone,
      websiteUrl: user.client.basicData?.websiteUrl,
      oneSignalAppId: user.client.oneSignalAppId,
      oneSignalApiKey: user.client.oneSignalApiKey,
      oneSignalSafariWebId: user.client.oneSignalSafariWebId
    } : null
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t('admin.users.editTitle')}
        </h1>
        <p className="text-muted-foreground">
          {t('admin.users.editSubtitle')}
        </p>
      </div>

      <div className="card max-w-2xl">
        <UserForm initialData={formData} />
      </div>

      {user.client && <DomainManager userId={user.id} />}
    </div>
  )
}