import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SystemSettings } from '@/components/admin/SystemSettings'
import { LoginBackgroundSettings } from '@/components/admin/LoginBackgroundSettings'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getLoginBackground } from '@/lib/login-background'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>Error: Acceso no autorizado</div>
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
        <h1 className="text-3xl font-bold text-white mb-2">
          Configuración del Sistema
        </h1>
        <p className="text-gray-400">
          Gestiona las configuraciones globales y ajustes del sistema
        </p>
      </div>

      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700">
          <TabsTrigger value="system" className="data-[state=active]:bg-blue-600">
            Sistema
          </TabsTrigger>
          <TabsTrigger value="login" className="data-[state=active]:bg-blue-600">
            Login
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-6">
          <SystemSettings stats={systemStats} />
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