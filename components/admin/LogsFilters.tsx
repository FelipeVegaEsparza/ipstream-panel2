'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Filter, Search, Calendar, Download, RefreshCw } from 'lucide-react'

export function LogsFilters() {
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
        alert('Error al exportar logs')
      }
    } catch (error) {
      alert('Error al exportar logs')
    }
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Búsqueda */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Buscar
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Buscar en logs..."
              className="bg-gray-700 border-gray-600 text-white pl-10"
            />
          </div>
        </div>

        {/* Nivel de Log */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nivel
          </label>
          <select
            value={filters.level}
            onChange={(e) => handleFilterChange('level', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
          >
            <option value="all">Todos los niveles</option>
            <option value="ERROR">Error</option>
            <option value="WARN">Advertencia</option>
            <option value="INFO">Información</option>
            <option value="DEBUG">Debug</option>
          </select>
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Categoría
          </label>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
          >
            <option value="all">Todas las categorías</option>
            <option value="AUTH">Autenticación</option>
            <option value="SECURITY">Seguridad</option>
            <option value="BILLING">Facturación</option>
            <option value="CONTENT">Contenido</option>
            <option value="SYSTEM">Sistema</option>
            <option value="API">API</option>
          </select>
        </div>

        {/* Rango de Fechas */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Fecha Desde
          </label>
          <Input
            type="datetime-local"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Fecha Hasta
          </label>
          <Input
            type="datetime-local"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>

        {/* Usuario ID */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Usuario ID
          </label>
          <Input
            value={filters.userId}
            onChange={(e) => handleFilterChange('userId', e.target.value)}
            placeholder="ID del usuario"
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>

        {/* IP Address */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Dirección IP
          </label>
          <Input
            value={filters.ip}
            onChange={(e) => handleFilterChange('ip', e.target.value)}
            placeholder="192.168.1.1"
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>

        {/* Filtros Activos */}
        {activeFilters.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Filtros Activos
            </label>
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <Badge key={filter} variant="secondary" className="bg-blue-600 text-white">
                  {filter}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="space-y-2 pt-4">
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Search className="h-4 w-4 mr-2" />
            Aplicar Filtros
          </Button>
          
          <Button
            onClick={clearAllFilters}
            variant="outline"
            className="w-full border-gray-600 hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Limpiar Filtros
          </Button>
          
          <Button
            onClick={exportLogs}
            variant="outline"
            className="w-full border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}