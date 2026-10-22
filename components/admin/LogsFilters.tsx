'use client'

import { useRouter } from 'next/navigation'

import { showToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Filter, Search, Calendar, Download, RefreshCw } from 'lucide-react'

export function LogsFilters() {
  const { t } = useDashboardI18n()
  const router = useRouter()
  const [filters, setFilters] = useState({
    level: 'all',
    category: 'all',
    dateFrom: '',
    dateTo: '',
    search: '',
    userId: '',
    ip: ''
  })

  const [activeFilters, setActiveFilters] = useState<string[]>([])

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value })
    
    // Actualizar filtros activos
    if (value && value !== 'all') {
      if (!activeFilters.includes(key)) {
        setActiveFilters([...activeFilters, key])
      }
    } else {
      setActiveFilters(activeFilters.filter(f => f !== key))
    }
  }

  const clearAllFilters = () => {
    setFilters({
      level: 'all',
      category: 'all',
      dateFrom: '',
      dateTo: '',
      search: '',
      userId: '',
      ip: ''
    })
    setActiveFilters([])
  }

  const exportLogs = async () => {
    try {
      const response = await fetch('/api/admin/logs/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `logs_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        showToast({ type: 'error', title: t('admin.logsFilters.errorExport') })
      }
    } catch (error) {
      showToast({ type: 'error', title: t('admin.logsFilters.errorExport') })
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Filter className="h-5 w-5" />
          {t('admin.logsFilters.filters')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Búsqueda */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            {t('admin.logsFilters.search')}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder={t('admin.logsFilters.searchPlaceholder')}
              className="bg-secondary border-border text-foreground pl-10"
            />
          </div>
        </div>

        {/* Nivel de Log */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            {t('admin.logsFilters.level')}
          </label>
          <select
            value={filters.level}
            onChange={(e) => handleFilterChange('level', e.target.value)}
            className="w-full bg-secondary border border-border text-foreground rounded-md px-3 py-2"
          >
            <option value="all">{t('admin.logsFilters.allLevels')}</option>
            <option value="ERROR">{t('admin.logsFilters.levelError')}</option>
            <option value="WARN">{t('admin.logsFilters.levelWarn')}</option>
            <option value="INFO">{t('admin.logsFilters.levelInfo')}</option>
            <option value="DEBUG">Debug</option>
          </select>
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            {t('admin.logsFilters.category')}
          </label>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="w-full bg-secondary border border-border text-foreground rounded-md px-3 py-2"
          >
            <option value="all">{t('admin.logsFilters.allCategories')}</option>
            <option value="AUTH">{t('admin.logsFilters.catAuth')}</option>
            <option value="SECURITY">{t('admin.logsFilters.catSecurity')}</option>
            <option value="BILLING">{t('admin.logsFilters.catBilling')}</option>
            <option value="CONTENT">{t('admin.logsFilters.catContent')}</option>
            <option value="SYSTEM">{t('admin.logsFilters.catSystem')}</option>
            <option value="API">{t('admin.logsFilters.catApi')}</option>
          </select>
        </div>

        {/* Rango de Fechas */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            {t('admin.logsFilters.dateFrom')}
          </label>
          <Input
            type="datetime-local"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="bg-secondary border-border text-foreground"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            {t('admin.logsFilters.dateTo')}
          </label>
          <Input
            type="datetime-local"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="bg-secondary border-border text-foreground"
          />
        </div>

        {/* Usuario ID */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            {t('admin.logsFilters.userId')}
          </label>
          <Input
            value={filters.userId}
            onChange={(e) => handleFilterChange('userId', e.target.value)}
            placeholder={t('admin.logsFilters.userIdPlaceholder')}
            className="bg-secondary border-border text-foreground"
          />
        </div>

        {/* IP Address */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            {t('admin.logsFilters.ip')}
          </label>
          <Input
            value={filters.ip}
            onChange={(e) => handleFilterChange('ip', e.target.value)}
            placeholder={t('admin.logsFilters.ipPlaceholder')}
            className="bg-secondary border-border text-foreground"
          />
        </div>

        {/* Filtros Activos */}
        {activeFilters.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('admin.logsFilters.activeFilters')}
            </label>
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <Badge key={filter} variant="secondary" className="bg-brand text-white">
                  {filter}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="space-y-2 pt-4">
          <Button
            onClick={() => router.refresh()}
            className="w-full bg-brand hover:bg-brand"
          >
            <Search className="h-4 w-4 mr-2" />
            {t('admin.logsFilters.apply')}
          </Button>
          
          <Button
            onClick={clearAllFilters}
            variant="outline"
            className="w-full border-border hover:bg-secondary"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('admin.logsFilters.clear')}
          </Button>
          
          <Button
            onClick={exportLogs}
            variant="outline"
            className="w-full border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('admin.logsFilters.export')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}