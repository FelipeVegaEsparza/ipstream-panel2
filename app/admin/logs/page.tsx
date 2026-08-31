import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LogsViewer } from '@/components/admin/LogsViewer'
import { LogsFilters } from '@/components/admin/LogsFilters'
import { LogsStats } from '@/components/admin/LogsStats'

export default async function LogsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>Error: Acceso no autorizado</div>
  }

  // Simular logs para demostración (en producción vendrían de una base de datos o archivos)
  const mockLogs = [
    {
      id: '1',
      timestamp: new Date('2024-07-16T10:30:00'),
      level: 'INFO',
      category: 'AUTH',
      message: 'Usuario admin@ipstream.com inició sesión exitosamente',
      userId: session.user.id,
      userEmail: 'admin@ipstream.com',
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      metadata: { action: 'login', success: true }
    },
    {
      id: '2',
      timestamp: new Date('2024-07-16T10:25:00'),
      level: 'WARN',
      category: 'SECURITY',
      message: 'Intento de acceso fallido desde IP sospechosa',
      userId: null,
      userEmail: 'hacker@malicious.com',
      ip: '45.123.45.67',
      userAgent: 'curl/7.68.0',
      metadata: { action: 'failed_login', attempts: 3 }
    },
    {
      id: '3',
      timestamp: new Date('2024-07-16T10:20:00'),
      level: 'INFO',
      category: 'BILLING',
      message: 'Pago procesado exitosamente para cliente Test Client',
      userId: 'client123',
      userEmail: 'cliente@test.com',
      ip: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      metadata: { action: 'payment', amount: 29.99, currency: 'USD' }
    },
    {
      id: '4',
      timestamp: new Date('2024-07-16T10:15:00'),
      level: 'ERROR',
      category: 'SYSTEM',
      message: 'Error al conectar con el servicio de email SMTP',
      userId: null,
      userEmail: null,
      ip: null,
      userAgent: null,
      metadata: { error: 'Connection timeout', service: 'smtp' }
    },
    {
      id: '5',
      timestamp: new Date('2024-07-16T10:10:00'),
      level: 'INFO',
      category: 'CONTENT',
      message: 'Nuevo programa creado: "Programa de Prueba"',
      userId: 'client123',
      userEmail: 'cliente@test.com',
      ip: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      metadata: { action: 'create_program', programId: 'prog123', programName: 'Programa de Prueba' }
    }
  ]

  // Estadísticas de logs
  const logsStats = {
    totalLogs: mockLogs.length,
    errorLogs: mockLogs.filter(log => log.level === 'ERROR').length,
    warningLogs: mockLogs.filter(log => log.level === 'WARN').length,
    infoLogs: mockLogs.filter(log => log.level === 'INFO').length,
    securityEvents: mockLogs.filter(log => log.category === 'SECURITY').length,
    uniqueUsers: new Set(mockLogs.filter(log => log.userId).map(log => log.userId)).size,
    uniqueIPs: new Set(mockLogs.filter(log => log.ip).map(log => log.ip)).size
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Logs de Actividad
        </h1>
        <p className="text-gray-400">
          Monitorea y analiza toda la actividad del sistema
        </p>
      </div>

      <LogsStats stats={logsStats} />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <LogsFilters />
        </div>
        <div className="lg:col-span-3">
          <LogsViewer logs={mockLogs} />
        </div>
      </div>
    </div>
  )
}