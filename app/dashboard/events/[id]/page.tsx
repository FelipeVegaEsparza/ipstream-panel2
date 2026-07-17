import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { PencilIcon, ArrowLeftIcon, CalendarDaysIcon, MapPinIcon, LinkIcon } from '@heroicons/react/24/outline'

interface EventDetailPageProps {
  params: { id: string }
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user.clientId) return <div>Error: No se encontró información del cliente</div>

  const event = await prisma.event.findFirst({
    where: { id: params.id, clientId: session.user.clientId },
  })

  if (!event) notFound()

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date))
  const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
  const past = new Date(event.date) < new Date(new Date().toDateString())

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/events" className="p-2 text-gray-400 hover:text-gray-600">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vista de Evento</h1>
            <p className="mt-1 text-sm text-gray-600">Información del evento</p>
          </div>
        </div>
        <Link href={`/dashboard/events/${event.id}/edit`} className="btn-primary flex items-center gap-2">
          <PencilIcon className="h-5 w-5" /> Editar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            {event.imageUrl && (
              <div className="relative h-64 rounded-lg overflow-hidden mb-6">
                <Image src={event.imageUrl} alt={event.title} fill className="object-cover" />
                {past && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-lg font-bold uppercase tracking-wider bg-black/60 px-4 py-2 rounded-lg">Finalizado</span>
                  </div>
                )}
              </div>
            )}

            <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>

            <div className="flex flex-wrap gap-4 mb-6 text-sm">
              <div className="flex items-center text-gray-600 gap-1.5">
                <CalendarDaysIcon className="h-5 w-5 text-cyan-500" />
                <span>{formatDate(event.date)}{event.time ? ` - ${event.time}` : ''}</span>
              </div>
              {event.location && (
                <div className="flex items-center text-gray-600 gap-1.5">
                  <MapPinIcon className="h-5 w-5 text-cyan-500" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>

            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">{event.description}</div>

            {event.eventUrl && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-blue-600" />
                  <a href={event.eventUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-sm break-all">
                    {event.eventUrl}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Estado:</span>
                <p className={`text-sm font-medium ${past ? 'text-red-600' : 'text-green-600'}`}>
                  {past ? 'Finalizado' : 'Próximo'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Fecha:</span>
                <p className="text-sm font-medium text-gray-900">{formatDate(event.date)}</p>
              </div>
              {event.time && (
                <div>
                  <span className="text-sm text-gray-500">Hora:</span>
                  <p className="text-sm font-medium text-gray-900">{event.time}</p>
                </div>
              )}
              {event.location && (
                <div>
                  <span className="text-sm text-gray-500">Ubicación:</span>
                  <p className="text-sm font-medium text-gray-900">{event.location}</p>
                </div>
              )}
              <div>
                <span className="text-sm text-gray-500">Creado:</span>
                <p className="text-sm font-medium text-gray-900">{formatDateTime(event.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones</h3>
            <Link href={`/dashboard/events/${event.id}/edit`} className="w-full btn-primary flex items-center justify-center gap-2">
              <PencilIcon className="h-4 w-4" /> Editar evento
            </Link>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">API REST</h3>
            <code className="block bg-blue-100 px-3 py-2 rounded text-xs text-blue-900 mt-1 break-all">
              GET /api/public/{session.user.clientId}/events
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
