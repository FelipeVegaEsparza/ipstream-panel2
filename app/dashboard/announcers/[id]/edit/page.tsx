import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { AnnouncerForm } from '@/components/dashboard/AnnouncerForm'

interface EditAnnouncerPageProps {
  params: { id: string }
}

export default async function EditAnnouncerPage({ params }: EditAnnouncerPageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user.clientId) return <div>Error: No se encontró información del cliente</div>

  const announcer = await prisma.announcer.findFirst({
    where: { id: params.id, clientId: session.user.clientId },
  })

  if (!announcer) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Locutor</h1>
        <p className="mt-1 text-sm text-gray-600">Modifica la información del locutor</p>
      </div>
      <div className="card max-w-2xl">
        <AnnouncerForm initialData={announcer} />
      </div>
    </div>
  )
}
