import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { PencilIcon, ArrowLeftIcon, GlobeAltIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

interface SponsorDetailPageProps {
  params: {
    id: string
  }
}

export default async function SponsorDetailPage({ params }: SponsorDetailPageProps) {
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
    { name: 'Facebook', url: sponsor.facebook, color: 'bg-brand hover:bg-brand' },
    { name: 'Instagram', url: sponsor.instagram, color: 'bg-pink-600 hover:bg-pink-700' },
    { name: 'YouTube', url: sponsor.youtube, color: 'bg-red-600 hover:bg-red-700' },
    { name: 'TikTok', url: sponsor.tiktok, color: 'bg-card hover:bg-background' },
    { name: 'X', url: sponsor.x, color: 'bg-card hover:bg-background' },
    { name: 'WhatsApp', url: sponsor.whatsapp, color: 'bg-green-600 hover:bg-green-700' },
  ].filter(network => network.url)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/sponsors"
            className="p-2 text-muted-foreground hover:text-muted-foreground"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {sponsor.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('sponsors.detailSubtitle')}
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/sponsors/${sponsor.id}/edit`}
          className="btn-primary flex items-center gap-2"
        >
          <PencilIcon className="h-5 w-5" />
          {t('common.edit')}
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
                    <span className="text-muted-foreground text-sm">{t('sponsors.noLogo')}</span>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {sponsor.name}
                </h2>
                
                {sponsor.address && (
                  <div className="flex items-center text-muted-foreground mb-4">
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
                {t('sponsors.website')}
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
                {t('sponsors.social')}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {socialNetworks.map((network) => (
                  <a
                    key={network.name}
                    href={network.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${network.color} text-foreground px-4 py-2 rounded-lg text-center text-sm font-medium transition-colors`}
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
              {t('sponsors.info')}
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">{t('sponsors.added')}</span>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(sponsor.createdAt)}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">{t('sponsors.updatedLabel')}</span>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(sponsor.updatedAt)}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">{t('sponsors.socialCount')}</span>
                <p className="text-sm font-medium text-gray-900">
                  {t('sponsors.configured', { count: socialNetworks.length })}
                </p>
              </div>
            </div>
          </div>

          {/* API Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              {t('sponsors.apiRest')}
            </h3>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-blue-600">{t('sponsors.all')}</span>
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