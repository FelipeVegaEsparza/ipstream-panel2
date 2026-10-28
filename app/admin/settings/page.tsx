import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SystemSettings } from '@/components/admin/SystemSettings'
import { LoginBackgroundSettings } from '@/components/admin/LoginBackgroundSettings'
import { ClientSitesSettings } from '@/components/admin/ClientSitesSettings'
import { VoiceSettings } from '@/components/admin/VoiceSettings'
import { PanelLogoManager } from '@/components/admin/PanelLogoManager'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getLoginBackground } from '@/lib/login-background'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export default async function SettingsPage() {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>{t('admin.accessDenied')}</div>
  }

  // Obtener configuraciones actuales del sistema
  const systemStats = {
    totalUsers: await prisma.user.count(),
    totalClients: await prisma.client.count(),
    totalContent: await prisma.program.count() +
                  await prisma.news.count() +
                  await prisma.rankingVideo.count() +
                  await prisma.sponsor.count() +
                  await prisma.promotion.count(),
    uptime: process.uptime(),
    nodeVersion: process.version
  }

  const currentLoginImage = await getLoginBackground()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t('admin.settings.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('admin.settings.subtitle')}
        </p>
      </div>

      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-card border-border">
          <TabsTrigger value="system" className="data-[state=active]:bg-brand">
            {t('admin.settings.tabSystem')}
          </TabsTrigger>
          <TabsTrigger value="sites" className="data-[state=active]:bg-brand">
            {t('admin.settings.tabSites')}
          </TabsTrigger>
          <TabsTrigger value="branding" className="data-[state=active]:bg-brand">
            {t('admin.settings.tabLogo')}
          </TabsTrigger>
          <TabsTrigger value="announce" className="data-[state=active]:bg-brand">
            {t('admin.settings.tabAnnounce')}
          </TabsTrigger>
          <TabsTrigger value="login" className="data-[state=active]:bg-brand">
            {t('admin.settings.tabLogin')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-6">
          <SystemSettings stats={systemStats} />
        </TabsContent>

        <TabsContent value="sites" className="space-y-6">
          <ClientSitesSettings />
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <PanelLogoManager />
        </TabsContent>

        <TabsContent value="announce" className="space-y-6">
          <VoiceSettings />
        </TabsContent>

        <TabsContent value="login" className="space-y-6">
          <div className="card max-w-2xl">
            <LoginBackgroundSettings currentImage={currentLoginImage} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}