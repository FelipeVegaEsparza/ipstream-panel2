import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { ProgramForm } from '@/components/dashboard/ProgramForm'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

interface EditProgramPageProps {
  params: {
    id: string
  }
}

export default async function EditProgramPage({ params }: EditProgramPageProps) {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)
  
  if (!session?.user.clientId) {
    return <div>{t('news.noClient')}</div>
  }

  const program = await prisma.program.findFirst({
    where: {
      id: params.id,
      clientId: session.user.clientId,
    }
  })

  if (!program) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('programs.editPage.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('programs.editPage.subtitle')}
        </p>
      </div>

      <div className="card max-w-2xl">
        <ProgramForm initialData={program} />
      </div>
    </div>
  )
}