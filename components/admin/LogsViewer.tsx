'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  AlertTriangle, 
  Info, 
  XCircle, 
  Eye, 
  Calendar,
  User,
  Globe,
  Monitor,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface LogEntry {
  id: string
  timestamp: Date
  level: string
  category: string
  message: string
  userId: string | null
  userEmail: string | null
  ip: string | null
  userAgent: string | null
  metadata: any
}

interface LogsViewerProps {
  logs: LogEntry[]
}

export function LogsViewer({ logs }: LogsViewerProps) {
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const logsPerPage = 10

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const getLevelBadge = (level: string) => {
    const levelConfig = {
      ERROR: { color: 'bg-red-600', icon: XCircle },
      WARN: { color: 'bg-orange-600', icon: AlertTriangle },
      INFO: { color: 'bg-blue-600', icon: Info },
      DEBUG: { color: 'bg-gray-600', icon: FileText }
    }

    const config = levelConfig[level as keyof typeof levelConfig] || levelConfig.INFO
    const Icon = config.icon

    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {level}
      </Badge>
    )
  }

  const getCategoryBadge = (category: string) => {
    const categoryColors = {
      AUTH: 'bg-green-600',
      SECURITY: 'bg-red-600',
      BILLING: 'bg-purple-600',
      CONTENT: 'bg-blue-600',
      SYSTEM: 'bg-gray-600',
      API: 'bg-orange-600'
    }

    const color = categoryColors[category as keyof typeof categoryColors] || 'bg-gray-600'

    return (
      <Badge className={`${color} text-white`}>
        {category}
      </Badge>
    )
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatUserAgent = (userAgent: string | null) => {
    if (!userAgent) return 'N/A'
    
    // Simplificar user agent para mostrar solo el navegador principal
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    if (userAgent.includes('curl')) return 'cURL'
    
    return 'Otro'
  }

  // Paginación
  const totalPages = Math.ceil(logs.length / logsPerPage)
  const startIndex = (currentPage - 1) * logsPerPage
  const endIndex = startIndex + logsPerPage
  const currentLogs = logs.slice(startIndex, endIndex)

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Logs del Sistema
          </div>
          <Badge variant="secondary" className="bg-gray-600 text-white">
            {logs.length} entradas
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {currentLogs.map((log) => (
            <div key={log.id} className="border border-gray-600 rounded-lg bg-gray-700/50">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      {getLevelBadge(log.level)}
                      {getCategoryBadge(log.category)}
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Calendar className="h-4 w-4" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </div>
                    
                    <p className="text-white font-medium">
                      {log.message}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                      {log.userEmail && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {log.userEmail}
                        </div>
                      )}
                      {log.ip && (
                        <div className="flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          {log.ip}
                        </div>
                      )}
                      {log.userAgent && (
                        <div className="flex items-center gap-1">
                          <Monitor className="h-4 w-4" />
                          {formatUserAgent(log.userAgent)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleExpanded(log.id)}
                    className="border-gray-600 hover:bg-gray-700"
                  >
                    {expandedLogs.has(log.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              {expandedLogs.has(log.id) && (
                <div className="border-t border-gray-600 p-4 bg-gray-800/50">
                  <h4 className="text-white font-medium mb-3">Detalles Técnicos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 mb-1">ID del Log:</p>
                      <p className="text-white font-mono">{log.id}</p>
                    </div>
                    
                    {log.userId && (
                      <div>
                        <p className="text-gray-400 mb-1">ID del Usuario:</p>
                        <p className="text-white font-mono">{log.userId}</p>
                      </div>
                    )}
                    
                    {log.ip && (
                      <div>
                        <p className="text-gray-400 mb-1">Dirección IP:</p>
                        <p className="text-white font-mono">{log.ip}</p>
                      </div>
                    )}
                    
                    {log.userAgent && (
                      <div className="md:col-span-2">
                        <p className="text-gray-400 mb-1">User Agent:</p>
                        <p className="text-white font-mono text-xs break-all">{log.userAgent}</p>
                      </div>
                    )}
                  </div>
                  
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-4">
                      <p className="text-gray-400 mb-2">Metadata:</p>
                      <pre className="bg-gray-900 p-3 rounded text-xs text-green-400 overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {logs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No hay logs disponibles
            </h3>
            <p className="text-gray-400">
              Los logs aparecerán aquí cuando haya actividad en el sistema
            </p>
          </div>
        )}
        
        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-600">
            <p className="text-sm text-gray-400">
              Mostrando {startIndex + 1} a {Math.min(endIndex, logs.length)} de {logs.length} entradas
            </p>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="border-gray-600 hover:bg-gray-700"
              >
                Anterior
              </Button>
              
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1
                  return (
                    <Button
                      key={page}
                      size="sm"
                      variant={currentPage === page ? "default" : "outline"}
                      onClick={() => setCurrentPage(page)}
                      className={currentPage === page ? "bg-blue-600" : "border-gray-600 hover:bg-gray-700"}
                    >
                      {page}
                    </Button>
                  )
                })}
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="border-gray-600 hover:bg-gray-700"
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}