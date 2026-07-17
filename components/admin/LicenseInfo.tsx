'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  FileText, 
  ExternalLink, 
  CheckCircle,
  AlertTriangle,
  Download
} from 'lucide-react'

export function LicenseInfo() {
  const licenses = [
    {
      name: 'IPStream Panel',
      version: '1.0.0',
      license: 'MIT License',
      status: 'Activa',
      description: 'Panel de administración principal',
      url: 'https://opensource.org/licenses/MIT'
    },
    {
      name: 'Next.js',
      version: '14.0.4',
      license: 'MIT License',
      status: 'Activa',
      description: 'Framework de React para aplicaciones web',
      url: 'https://github.com/vercel/next.js/blob/canary/license.md'
    },
    {
      name: 'Prisma',
      version: '5.22.0',
      license: 'Apache 2.0',
      status: 'Activa',
      description: 'ORM para base de datos',
      url: 'https://github.com/prisma/prisma/blob/main/LICENSE'
    },
    {
      name: 'NextAuth.js',
      version: '4.24.5',
      license: 'ISC License',
      status: 'Activa',
      description: 'Autenticación para Next.js',
      url: 'https://github.com/nextauthjs/next-auth/blob/main/LICENSE'
    },
    {
      name: 'Tailwind CSS',
      version: '3.3.6',
      license: 'MIT License',
      status: 'Activa',
      description: 'Framework de CSS utilitario',
      url: 'https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE'
    },
    {
      name: 'Lucide React',
      version: '0.294.0',
      license: 'ISC License',
      status: 'Activa',
      description: 'Iconos para React',
      url: 'https://github.com/lucide-icons/lucide/blob/main/LICENSE'
    }
  ]

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'Activa': { color: 'bg-green-600', icon: CheckCircle },
      'Expirada': { color: 'bg-red-600', icon: AlertTriangle },
      'Por Vencer': { color: 'bg-orange-600', icon: AlertTriangle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['Activa']
    const Icon = config.icon

    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  const getLicenseBadge = (license: string) => {
    const licenseColors = {
      'MIT License': 'bg-blue-600',
      'Apache 2.0': 'bg-purple-600',
      'ISC License': 'bg-green-600',
      'GPL v3': 'bg-orange-600'
    }

    const color = licenseColors[license as keyof typeof licenseColors] || 'bg-gray-600'

    return (
      <Badge className={`${color} text-white`}>
        {license}
      </Badge>
    )
  }

  const generateLicenseReport = async () => {
    try {
      const response = await fetch('/api/admin/licenses/report')
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `license_report_${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Error al generar reporte de licencias')
      }
    } catch (error) {
      alert('Error al generar reporte de licencias')
    }
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Información de Licencias
        </CardTitle>
        <Button
          onClick={generateLicenseReport}
          size="sm"
          variant="outline"
          className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Generar Reporte
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {licenses.map((license, index) => (
            <div key={index} className="p-4 rounded-lg bg-gray-700/50 border border-gray-600">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-white font-semibold">{license.name}</h4>
                    <Badge variant="outline" className="border-gray-500 text-gray-300">
                      v{license.version}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">
                    {license.description}
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  {getStatusBadge(license.status)}
                  {getLicenseBadge(license.license)}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <FileText className="h-4 w-4" />
                  <span>Licencia: {license.license}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(license.url, '_blank')}
                  className="border-gray-600 hover:bg-gray-700"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Ver Licencia
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Resumen de Licencias */}
        <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-blue-400" />
            <h4 className="text-white font-semibold">Resumen de Cumplimiento</h4>
          </div>
          <p className="text-sm text-gray-300 mb-3">
            Todas las dependencias utilizadas en este proyecto cumplen con licencias de código abierto compatibles. 
            El sistema está en pleno cumplimiento con las obligaciones de licencia.
          </p>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span>{licenses.filter(l => l.status === 'Activa').length} Licencias Activas</span>
            </div>
            <div className="flex items-center gap-1 text-blue-400">
              <FileText className="h-4 w-4" />
              <span>{licenses.length} Total de Componentes</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}