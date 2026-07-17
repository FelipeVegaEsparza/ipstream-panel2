import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { PencilIcon, ArrowLeftIcon, LinkIcon } from '@heroicons/react/24/outline'

interface PromotionDetailPageProps {
  params: {
    id: string
  }
}

export default async function PromotionDetailPage({ params }: PromotionDetailPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user.clientId) {
    return <div>Error: No se encontró información del cliente</div>
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/promotions"
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Vista de Promoción
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Previsualización de cómo se ve la promoción
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/promotions/${promotion.id}/edit`}
          className="btn-primary flex items-center gap-2"
        >
          <PencilIcon className="h-5 w-5" />
          Editar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="card">
            <article className="space-y-6">
              <header>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {promotion.title}
                </h1>
                
                <div className="flex items-center text-sm text-gray-500 mb-6">
                  <span>Creado: {formatDate(promotion.createdAt)}</span>
                  <span className="mx-2">•</span>
                  <span>Actualizado: {formatDate(promotion.updatedAt)}</span>
                </div>
              </header>

              {promotion.imageUrl && (
                <div className="mb-6">
                  <Image
                    src={promotion.imageUrl}
                    alt={promotion.title}
                    width={800}
                    height={400}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              )}

              <div className="prose prose-lg max-w-none">
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {promotion.description}
                </div>
              </div>

              {promotion.link && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <LinkIcon className="h-5 w-5 text-primary-600 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-primary-800">
                        Enlace de la promoción
                      </h3>
                      <a
                        href={promotion.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 text-sm break-all"
                      >
                        {promotion.link}
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </article>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Información
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Estado:</span>
                <p className="text-sm font-medium text-green-600">
                  Activa
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Creada:</span>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(promotion.createdAt)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Última actualización:</span>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(promotion.updatedAt)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Tiene imagen:</span>
                <p className="text-sm font-medium text-gray-900">
                  {promotion.imageUrl ? 'Sí' : 'No'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Tiene enlace:</span>
                <p className="text-sm font-medium text-gray-900">
                  {promotion.link ? 'Sí' : 'No'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Acciones
            </h3>
            <div className="space-y-3">
              {promotion.link && (
                <a
                  href={promotion.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full btn-secondary flex items-center justify-center gap-2"
                >
                  <LinkIcon className="h-4 w-4" />
                  Visitar enlace
                </a>
              )}
              <Link
                href={`/dashboard/promotions/${promotion.id}/edit`}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <PencilIcon className="h-4 w-4" />
                Editar promoción
              </Link>
            </div>
          </div>

          {/* API Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              API REST
            </h3>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-blue-600">Todas las promociones:</span>
                <code className="block bg-blue-100 px-3 py-2 rounded text-xs text-blue-900 mt-1 break-all">
                  GET /api/public/{session.user.clientId}/promotions
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}