import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { PencilIcon, ArrowLeftIcon, MicrophoneIcon } from '@heroicons/react/24/outline'

interface AnnouncerDetailPageProps {
  params: { id: string }
}

export default async function AnnouncerDetailPage({ params }: AnnouncerDetailPageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user.clientId) return <div>Error: No se encontró información del cliente</div>

  const announcer = await prisma.announcer.findFirst({
    where: { id: params.id, clientId: session.user.clientId },
  })

  if (!announcer) notFound()

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/announcers" className="p-2 text-gray-400 hover:text-gray-600">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vista de Locutor</h1>
            <p className="mt-1 text-sm text-gray-600">Información del locutor</p>
          </div>
        </div>
        <Link href={`/dashboard/announcers/${announcer.id}/edit`} className="btn-primary flex items-center gap-2">
          <PencilIcon className="h-5 w-5" /> Editar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {announcer.imageUrl ? (
                <Image src={announcer.imageUrl} alt={announcer.name} width={200} height={200} className="w-48 h-48 object-cover rounded-xl border border-gray-200" />
              ) : (
                <div className="w-48 h-48 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200">
                  <MicrophoneIcon className="h-16 w-16 text-gray-400" />
                </div>
              )}
              <div className="space-y-4 flex-1">
                <h1 className="text-3xl font-bold text-gray-900">{announcer.name}</h1>
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">{announcer.description}</div>
                <div className="flex items-center text-sm text-gray-500">
                  <span>Creado: {formatDate(announcer.createdAt)}</span>
                  <span className="mx-2">&bull;</span>
                  <span>Actualizado: {formatDate(announcer.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones</h3>
            <Link href={`/dashboard/announcers/${announcer.id}/edit`} className="w-full btn-primary flex items-center justify-center gap-2">
              <PencilIcon className="h-4 w-4" /> Editar locutor
            </Link>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">API REST</h3>
            <code className="block bg-blue-100 px-3 py-2 rounded text-xs text-blue-900 mt-1 break-all">
              GET /api/public/{session.user.clientId}/announcers
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
