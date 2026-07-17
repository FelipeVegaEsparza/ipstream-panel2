'use client'

import { useEffect, useState } from 'react'
import { DashboardStats } from './DashboardStats'

interface ClientData {
  id: string
  name: string
  email: string
  projectName: string
}

export function DashboardImpersonated() {
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadClientData = () => {
      try {
        // Obtener información del cliente del localStorage
        const clientInfo = localStorage.getItem('impersonation_client')
        
        if (!clientInfo) {
          setError('No se encontró información del cliente')
          setLoading(false)
          return
        }

        const parsedClientInfo = JSON.parse(clientInfo)
        
        setClientData({
          id: parsedClientInfo.id,
          name: parsedClientInfo.name,
          email: parsedClientInfo.email,
          projectName: parsedClientInfo.projectName || parsedClientInfo.name
        })
        
        setLoading(false)
      } catch (error) {
        console.error('Error loading client data:', error)
        setError('Error al cargar datos del cliente')
        setLoading(false)
      }
    }

    loadClientData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-white mb-2">
            Cargando datos del cliente...
          </h3>
          <p className="text-gray-400">
            Configurando la sesión de impersonación
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            Error de Impersonación
          </h3>
          <p className="text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.href = '/admin'}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Volver al Admin
          </button>
        </div>
      </div>
    )
  }

  if (!clientData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-white mb-2">
            No se encontraron datos del cliente
          </h3>
          <p className="text-gray-400">
            No se pudieron cargar los datos del cliente impersonado
          </p>
        </div>
      </div>
    )
  }

  // Datos de ejemplo para mostrar el dashboard funcionando
  const stats = [
    {
      name: 'Programas',
      value: 0,
      href: '/dashboard/programs',
      color: 'bg-blue-500'
    },
    {
      name: 'Noticias',
      value: 0,
      href: '/dashboard/news',
      color: 'bg-green-500'
    },
    {
      name: 'Videos',
      value: 0,
      href: '/dashboard/videos',
      color: 'bg-purple-500'
    },
    {
      name: 'Auspiciadores',
      value: 0,
      href: '/dashboard/sponsors',
      color: 'bg-yellow-500'
    },
    {
      name: 'Promociones',
      value: 0,
      href: '/dashboard/promotions',
      color: 'bg-red-500'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Dashboard - {clientData.projectName}
        </h1>
        <p className="text-gray-400 mb-6">
          Impersonando cliente: {clientData.email}
        </p>
        <div className="glass-effect rounded-xl p-4 mb-6">
          <p className="text-sm text-cyan-400">
            <strong>Client ID:</strong> <code className="bg-gray-700/50 px-3 py-1 rounded-lg text-xs font-mono text-cyan-300 ml-2">{clientData.id}</code>
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Modo impersonación activo - Todos los cambios se aplicarán a este cliente
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-300 mb-2">
              ¡Impersonación Exitosa!
            </h3>
            <p className="text-sm text-green-200/80 mb-4">
              Estás viendo el dashboard como el cliente <strong>{clientData.name}</strong>. 
              Puedes navegar por todas las secciones y realizar cambios como si fueras este cliente.
            </p>
            <div className="flex gap-3">
              <a
                href="/dashboard/basic-data"
                className="inline-flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Ver Datos Básicos
              </a>
              <a
                href="/dashboard/programs"
                className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Ver Programas
              </a>
            </div>
          </div>
        </div>
      </div>

      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-white mb-6 flex items-center">
            <svg className="w-5 h-5 text-cyan-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Acciones Rápidas
          </h3>
          <div className="space-y-3">
            <a
              href="/dashboard/programs/new"
              className="block p-4 border border-gray-600 rounded-xl hover:bg-gray-700/50 hover:border-cyan-500/50 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-white">Agregar Programa</div>
                  <div className="text-sm text-gray-400">Crear un nuevo programa de radio</div>
                </div>
              </div>
            </a>
            <a
              href="/dashboard/news/new"
              className="block p-4 border border-gray-600 rounded-xl hover:bg-gray-700/50 hover:border-cyan-500/50 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-white">Publicar Noticia</div>
                  <div className="text-sm text-gray-400">Agregar una nueva noticia</div>
                </div>
              </div>
            </a>
            <a
              href="/dashboard/videos/new"
              className="block p-4 border border-gray-600 rounded-xl hover:bg-gray-700/50 hover:border-cyan-500/50 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-white">Agregar Video</div>
                  <div className="text-sm text-gray-400">Añadir video al ranking</div>
                </div>
              </div>
            </a>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-white mb-6 flex items-center">
            <svg className="w-5 h-5 text-cyan-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Información del Cliente
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
              <span className="text-sm text-gray-300">Nombre del Cliente</span>
              <span className="text-sm font-medium text-white">
                {clientData.name}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
              <span className="text-sm text-gray-300">Email</span>
              <span className="text-sm font-medium text-white">
                {clientData.email}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
              <span className="text-sm text-gray-300">Proyecto</span>
              <span className="text-sm font-medium text-white">
                {clientData.projectName}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-500/20 rounded-lg border border-green-500/30">
              <span className="text-sm text-green-300">Estado</span>
              <span className="text-sm font-medium text-green-400">
                Impersonación Activa
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}