import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SystemInfo } from '@/components/admin/SystemInfo'
import { LicenseInfo } from '@/components/admin/LicenseInfo'
import { SupportInfo } from '@/components/admin/SupportInfo'
import { ChangelogInfo } from '@/components/admin/ChangelogInfo'

export default async function AboutPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>Error: Acceso no autorizado</div>
  }

  // Información del sistema
  const systemInfo = {
    version: '1.0.0',
    buildDate: '2024-07-16',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage()
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Acerca del Sistema
        </h1>
        <p className="text-gray-400">
          Información técnica, licencias y soporte del IPStream Panel
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <SystemInfo info={systemInfo} />
          <LicenseInfo />
        </div>
        
        <div className="space-y-8">
          <SupportInfo />
          <ChangelogInfo />
        </div>
      </div>
    </div>
  )
}