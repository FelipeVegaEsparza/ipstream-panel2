import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PencilIcon, ArrowLeftIcon, ArrowPathRoundedSquareIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

interface UserDetailPageProps {
    params: {
        id: string
    }
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
    const locale = getDashboardLocale()
    const t = dashboardT(locale)
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
        return <div>{t('admin.accessDenied')}</div>
    }

    const user = await prisma.user.findUnique({
        where: { id: params.id },
        include: {
            client: {
                include: {
                    basicData: true,
                    socialNetworks: true,
                    programs: {
                        orderBy: { createdAt: 'desc' },
                        take: 5
                    },
                    news: {
                        orderBy: { createdAt: 'desc' },
                        take: 5
                    },
                    rankingVideos: {
                        orderBy: { order: 'asc' },
                        take: 5
                    },
                    sponsors: {
                        orderBy: { createdAt: 'desc' },
                        take: 5
                    },
                    promotions: {
                        orderBy: { createdAt: 'desc' },
                        take: 5
                    },
                    plan: true,
                    _count: {
                        select: {
                            programs: true,
                            news: true,
                            rankingVideos: true,
                            sponsors: true,
                            promotions: true
                        }
                    }
                }
            }
        }
    })

    if (!user) {
        notFound()
    }

    const disabledMenuCount = user.client
        ? await prisma.clientMenuItem.count({
              where: { clientId: user.client.id, enabled: false },
          })
        : 0

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date)
    }

    const totalContent = user.client?._count ?
        user.client._count.programs + user.client._count.news + user.client._count.rankingVideos +
        user.client._count.sponsors + user.client._count.promotions : 0

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <Link
                        href="/admin/users"
                        className="p-2 text-muted-foreground hover:text-muted-foreground transition-colors"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">
                            {user.name || t('admin.userDetail.noName')}
                        </h1>
                        <p className="text-muted-foreground">
                            {t('admin.userDetail.subtitle')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <Link
                        href={`/admin/users/${user.id}/menu`}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <Cog6ToothIcon className="h-5 w-5" />
                        {t('admin.userDetail.menu')}
                    </Link>
                    <Link
                        href={`/admin/impersonate?userId=${user.id}`}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <ArrowPathRoundedSquareIcon className="h-5 w-5" />
                        {t('admin.userDetail.impersonate')}
                    </Link>
                    <Link
                        href={`/admin/users/${user.id}/edit`}
                        className="btn-primary flex items-center gap-2"
                    >
                        <PencilIcon className="h-5 w-5" />
                        {t('admin.userDetail.edit')}
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Información Principal */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Datos del Usuario */}
                    <div className="card">
                        <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center">
                            <svg className="w-6 h-6 text-brand mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {t('admin.userDetail.userInfo')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm text-muted-foreground">{t('admin.userDetail.name')}</label>
                                <p className="text-foreground font-medium">{user.name || t('admin.stats.notSpecified')}</p>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">{t('admin.userDetail.email')}</label>
                                <p className="text-foreground font-medium">{user.email}</p>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">{t('admin.userDetail.role')}</label>
                                <span className="inline-flex px-2 py-1 text-xs rounded-full bg-brand/20 text-brand border border-brand/30">
                                    {user.role}
                                </span>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">{t('admin.userDetail.plan')}</label>
                                {(() => {
                                    const planName = user.client?.plan?.name?.toLowerCase() || 'basic'
                                    const planClasses = planName === 'pro'
                                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                        : planName === 'enterprise'
                                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            : 'bg-brand/20 text-brand border border-brand/30'
                                    return (
                                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${planClasses}`}>
                                            {user.client?.plan?.name || 'basic'}
                                        </span>
                                    )
                                })()}
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">{t('admin.userDetail.registered')}</label>
                                <p className="text-foreground">{formatDate(user.createdAt)}</p>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">{t('admin.userDetail.lastActivity')}</label>
                                <p className="text-foreground">{formatDate(user.updatedAt)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Datos del Proyecto */}
                    {user.client?.basicData && (
                        <div className="card">
                            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center">
                                <svg className="w-6 h-6 text-brand mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                {t('admin.userDetail.projectInfo')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm text-muted-foreground">{t('admin.userDetail.projectName')}</label>
                                    <p className="text-foreground font-medium">{user.client.basicData.projectName}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground">{t('admin.userDetail.logo')}</label>
                                    {user.client.basicData.logoUrl ? (
                                        <img
                                            src={user.client.basicData.logoUrl}
                                            alt="Logo"
                                            className="h-12 w-auto object-contain bg-secondary/30 rounded p-1"
                                        />
                                    ) : (
                                        <p className="text-muted-foreground">{t('admin.userDetail.notConfigured')}</p>
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-sm text-muted-foreground">{t('admin.userDetail.description')}</label>
                                    <p className="text-foreground">{user.client.basicData.projectDescription}</p>
                                </div>
                                {user.client.basicData.radioStreamingUrl && (
                                    <div>
                                        <label className="text-sm text-muted-foreground">{t('admin.userDetail.radioUrl')}</label>
                                        <a
                                            href={user.client.basicData.radioStreamingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-brand hover:text-brand break-all"
                                        >
                                            {user.client.basicData.radioStreamingUrl}
                                        </a>
                                    </div>
                                )}
                                {user.client.basicData.videoStreamingUrl && (
                                    <div>
                                        <label className="text-sm text-muted-foreground">{t('admin.userDetail.videoUrl')}</label>
                                        <a
                                            href={user.client.basicData.videoStreamingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-brand hover:text-brand break-all"
                                        >
                                            {user.client.basicData.videoStreamingUrl}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Contenido Reciente */}
                    <div className="card">
                        <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center">
                            <svg className="w-6 h-6 text-brand mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {t('admin.userDetail.recentContent')}
                        </h3>

                        {/* Programas */}
                        {user.client?.programs && user.client.programs.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-lg font-medium text-foreground mb-3">{t('admin.dashboard.totalPrograms')} ({user.client._count.programs})</h4>
                                <div className="space-y-2">
                                    {user.client.programs.map((program) => (
                                        <div key={program.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                                            <div>
                                                <p className="text-foreground font-medium">{program.name}</p>
                                                <p className="text-sm text-muted-foreground">{program.startTime} - {program.endTime}</p>
                                            </div>
                                            <span className="text-xs text-muted-foreground">{formatDate(program.createdAt)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Noticias */}
                        {user.client?.news && user.client.news.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-lg font-medium text-foreground mb-3">{t('admin.dashboard.totalNews')} ({user.client._count.news})</h4>
                                <div className="space-y-2">
                                    {user.client.news.map((news) => (
                                        <div key={news.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                                            <div>
                                                <p className="text-foreground font-medium">{news.name}</p>
                                                <p className="text-sm text-muted-foreground">{news.shortText.substring(0, 100)}...</p>
                                            </div>
                                            <span className="text-xs text-muted-foreground">{formatDate(news.createdAt)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {totalContent === 0 && (
                            <p className="text-muted-foreground text-center py-8">
                                {t('admin.userDetail.noContent')}
                            </p>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Estadísticas */}
                    <div className="card">
                        <h3 className="text-lg font-medium text-foreground mb-4">
                            {t('admin.userDetail.stats')}
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('admin.userDetail.totalContent')}</span>
                                <span className="text-foreground font-semibold">{totalContent}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('admin.dashboard.totalPrograms')}</span>
                                <span className="text-brand">{user.client?._count.programs || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('admin.dashboard.totalNews')}</span>
                                <span className="text-green-400">{user.client?._count.news || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('admin.dashboard.totalVideos')}</span>
                                <span className="text-purple-400">{user.client?._count.rankingVideos || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('admin.dashboard.totalSponsors')}</span>
                                <span className="text-yellow-400">{user.client?._count.sponsors || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('admin.dashboard.totalPromotions')}</span>
                                <span className="text-pink-400">{user.client?._count.promotions || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Acciones */}
                    <div className="card">
                        <h3 className="text-lg font-medium text-foreground mb-4">
                            {t('admin.dashboard.quickActions')}
                        </h3>
                        <div className="space-y-3">
                            <Link
                                href={`/admin/users/${user.id}/menu`}
                                className="w-full btn-secondary flex items-center justify-center gap-2"
                            >
                                <Cog6ToothIcon className="h-4 w-4" />
                                {t('admin.userDetail.configureMenu')}
                                {disabledMenuCount > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                        {t('admin.userDetail.hidden', { count: disabledMenuCount })}
                                    </span>
                                )}
                            </Link>
                            <Link
                                href={`/admin/impersonate?userId=${user.id}`}
                                className="w-full btn-secondary flex items-center justify-center gap-2"
                            >
                                <ArrowPathRoundedSquareIcon className="h-4 w-4" />
                                {t('admin.userDetail.impersonateClient')}
                            </Link>
                            <Link
                                href={`/admin/users/${user.id}/edit`}
                                className="w-full btn-primary flex items-center justify-center gap-2"
                            >
                                <PencilIcon className="h-4 w-4" />
                                {t('admin.userDetail.editUser')}
                            </Link>
                        </div>
                    </div>

                    {/* API Info */}
                    <div className="bg-blue-50/10 border border-brand/30 rounded-xl p-4">
                        <h3 className="text-sm font-medium text-brand mb-2">
                            {t('admin.userDetail.clientApi')}
                        </h3>
                        {user.client && (
                            <div className="space-y-2">
                                <div>
                                    <span className="text-xs text-brand">Client ID:</span>
                                    <code className="block bg-secondary/50 px-2 py-1 rounded text-xs text-brand mt-1 break-all">
                                        {user.client.id}
                                    </code>
                                </div>
                                <div>
                                    <span className="text-xs text-brand">API URL:</span>
                                    <code className="block bg-secondary/50 px-2 py-1 rounded text-xs text-brand mt-1 break-all">
                                        /api/public/{user.client.id}
                                    </code>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}