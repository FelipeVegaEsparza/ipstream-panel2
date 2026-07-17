import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { PencilIcon, ArrowLeftIcon, GlobeAltIcon, MapPinIcon } from '@heroicons/react/24/outline'

interface SponsorDetailPageProps {
  params: {
    id: string
  }
}

export default async function SponsorDetailPage({ params }: SponsorDetailPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user.clientId) {
    return <div>Error: No se encontró información del cliente</div>
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const socialNetworks = [
    { name: 'Facebook', url: sponsor.facebook, color: 'bg-blue-600 hover:bg-blue-700' },
    { name: 'Instagram', url: sponsor.instagram, color: 'bg-pink-600 hover:bg-pink-700' },
    { name: 'YouTube', url: sponsor.youtube, color: 'bg-red-600 hover:bg-red-700' },
    { name: 'TikTok', url: sponsor.tiktok, color: 'bg-gray-800 hover:bg-gray-900' },
    { name: 'X', url: sponsor.x, color: 'bg-gray-800 hover:bg-gray-900' },
    { name: 'WhatsApp', url: sponsor.whatsapp, color: 'bg-green-600 hover:bg-green-700' },
  ].filter(network => network.url)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/sponsors"
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {sponsor.name}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Información completa del auspiciador
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/sponsors/${sponsor.id}/edit`}
          className="btn-primary flex items-center gap-2"
        >
          <PencilIcon className="h-5 w-5" />
          Editar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-start space-x-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                {sponsor.logoUrl ? (
                  <Image
                    src={sponsor.logoUrl}
                    alt={sponsor.name}
                    width={150}
                    height={100}
                    className="h-24 w-auto object-contain"
                  />
                ) : (
                  <div className="h-24 w-32 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Sin logo</span>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {sponsor.name}
                </h2>
                
                {sponsor.address && (
                  <div className="flex items-center text-gray-600 mb-4">
                    <MapPinIcon className="h-5 w-5 mr-2" />
                    {sponsor.address}
                  </div>
                )}

                <p className="text-gray-700 leading-relaxed">
                  {sponsor.description}
                </p>
              </div>
            </div>
          </div>

          {/* Website */}
          {sponsor.website && (
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Sitio Web
              </h3>
              <a
                href={sponsor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-primary-600 hover:text-primary-700"
              >
                <GlobeAltIcon className="h-5 w-5 mr-2" />
                {sponsor.website}
              </a>
            </div>
          )}

          {/* Social Networks */}
          {socialNetworks.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Redes Sociales
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {socialNetworks.map((network) => (
                  <a
                    key={network.name}
                    href={network.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${network.color} text-white px-4 py-2 rounded-lg text-center text-sm font-medium transition-colors`}
                  >
                    {network.name}
                  </a>
                ))}
              </div>
            </div>
          )}
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
                <span className="text-sm text-gray-500">Agregado:</span>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(sponsor.createdAt)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Última actualización:</span>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(sponsor.updatedAt)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Redes sociales:</span>
                <p className="text-sm font-medium text-gray-900">
                  {socialNetworks.length} configuradas
                </p>
              </div>
            </div>
          </div>

          {/* API Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              API REST
            </h3>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-blue-600">Todos los auspiciadores:</span>
                <code className="block bg-blue-100 px-3 py-2 rounded text-xs text-blue-900 mt-1 break-all">
                  GET /api/public/{session.user.clientId}/sponsors
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}