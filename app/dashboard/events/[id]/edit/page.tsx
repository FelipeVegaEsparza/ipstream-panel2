import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EventForm } from '@/components/dashboard/EventForm'

interface EditEventPageProps {
  params: { id: string }
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user.clientId) return <div>Error: No se encontró información del cliente</div>

  const event = await prisma.event.findFirst({
    where: { id: params.id, clientId: session.user.clientId },
  })

  if (!event) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Evento</h1>
        <p className="mt-1 text-sm text-gray-600">Modifica la información del evento</p>
      </div>
      <div className="card max-w-2xl">
        <EventForm initialData={event} />
      </div>
    </div>
  )
}
