'use client'

import { showToast } from '@/components/ui/toast'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { 
  Shield, 
  FileText, 
  ExternalLink, 
  CheckCircle,
  AlertTriangle,
  Download
} from 'lucide-react'

export function LicenseInfo() {
  const { t } = useDashboardI18n()
  const licenses = [
    {
      name: 'CasterFly',
      version: '1.0.0',
      license: 'MIT License',
      status: 'active',
      description: t('admin.licenseInfo.mainPanel'),
      url: 'https://opensource.org/licenses/MIT'
    },
    {
      name: 'Next.js',
      version: '14.0.4',
      license: 'MIT License',
      status: 'active',
      description: t('admin.licenseInfo.reactFramework'),
      url: 'https://github.com/vercel/next.js/blob/canary/license.md'
    },
    {
      name: 'Prisma',
      version: '5.22.0',
      license: 'Apache 2.0',
      status: 'active',
      description: t('admin.licenseInfo.databaseOrm'),
      url: 'https://github.com/prisma/prisma/blob/main/LICENSE'
    },
    {
      name: 'NextAuth.js',
      version: '4.24.5',
      license: 'ISC License',
      status: 'active',
      description: t('admin.licenseInfo.nextAuthDesc'),
      url: 'https://github.com/nextauthjs/next-auth/blob/main/LICENSE'
    },
    {
      name: 'Tailwind CSS',
      version: '3.3.6',
      license: 'MIT License',
      status: 'active',
      description: t('admin.licenseInfo.cssFramework'),
      url: 'https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE'
    },
    {
      name: 'Lucide React',
      version: '0.294.0',
      license: 'ISC License',
      status: 'active',
      description: t('admin.licenseInfo.reactIcons'),
      url: 'https://github.com/lucide-icons/lucide/blob/main/LICENSE'
    }
  ]

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
      active: { color: 'bg-green-600', icon: CheckCircle, label: t('admin.licenseInfo.active') },
      expired: { color: 'bg-red-600', icon: AlertTriangle, label: t('admin.licenseInfo.expired') },
      expiring: { color: 'bg-orange-600', icon: AlertTriangle, label: t('admin.licenseInfo.expiring') },
    }

    const config = statusConfig[status] || statusConfig.active
    const Icon = config.icon

    return (
      <Badge className={`${config.color} text-foreground flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getLicenseBadge = (license: string) => {
    const licenseColors = {
      'MIT License': 'bg-brand',
      'Apache 2.0': 'bg-purple-600',
      'ISC License': 'bg-green-600',
      'GPL v3': 'bg-orange-600'
    }

    const color = licenseColors[license as keyof typeof licenseColors] || 'bg-secondary'

    return (
      <Badge className={`${color} text-foreground`}>
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
        showToast({ type: 'error', title: t('admin.licenseInfo.reportError') })
      }
    } catch (error) {
      showToast({ type: 'error', title: t('admin.licenseInfo.reportError') })
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t('admin.licenseInfo.title')}
        </CardTitle>
        <Button
          onClick={generateLicenseReport}
          size="sm"
          variant="outline"
          className="border-brand text-brand hover:bg-brand hover:text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          {t('admin.licenseInfo.generateReport')}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {licenses.map((license, index) => (
            <div key={index} className="p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-foreground font-semibold">{license.name}</h4>
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      v{license.version}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {license.description}
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  {getStatusBadge(license.status)}
                  {getLicenseBadge(license.license)}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{t('admin.licenseInfo.license', { license: license.license })}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(license.url, '_blank')}
                  className="border-border hover:bg-secondary"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  {t('admin.licenseInfo.viewLicense')}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Resumen de Licencias */}
        <div className="mt-6 p-4 rounded-lg bg-brand/10 border border-brand/30">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-brand" />
            <h4 className="text-foreground font-semibold">{t('admin.licenseInfo.compliance')}</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {t('admin.licenseInfo.complianceHint')}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span>{t('admin.licenseInfo.activeCount', { count: licenses.filter(l => l.status === 'active').length })}</span>
            </div>
            <div className="flex items-center gap-1 text-brand">
              <FileText className="h-4 w-4" />
              <span>{t('admin.licenseInfo.componentsCount', { count: licenses.length })}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}