import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { PollForm } from '@/components/dashboard/PollForm'

interface EditPollPageProps {
  params: { id: string }
}

export default async function EditPollPage({ params }: EditPollPageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user.clientId) return <div>Error: No se encontró información del cliente</div>

  const poll = await prisma.poll.findFirst({
    where: { id: params.id, clientId: session.user.clientId },
    include: { options: true },
  })

  if (!poll) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Encuesta</h1>
        <p className="mt-1 text-sm text-gray-600">Modifica la pregunta y opciones de la encuesta</p>
      </div>
      <div className="card max-w-2xl">
        <PollForm initialData={poll} />
      </div>
    </div>
  )
}
