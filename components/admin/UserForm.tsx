'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// Esquema para crear usuario (contraseña requerida)
const createUserSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  clientName: z.string().min(1, 'El nombre del proyecto es requerido'),
  phone: z.string().optional().transform(val => val?.trim() || undefined),
  oneSignalAppId: z.string().optional().transform(val => val?.trim() || undefined),
  oneSignalApiKey: z.string().optional().transform(val => val?.trim() || undefined),
})

// Esquema para editar usuario (contraseña opcional)
const editUserSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().optional().refine(
    (val) => !val || val.length >= 6,
    'La contraseña debe tener al menos 6 caracteres'
  ),
  clientName: z.string().min(1, 'El nombre del proyecto es requerido'),
  phone: z.string().optional().transform(val => val?.trim() || undefined),
  oneSignalAppId: z.string().optional().transform(val => val?.trim() || undefined),
  oneSignalApiKey: z.string().optional().transform(val => val?.trim() || undefined),
})

type UserInput = z.infer<typeof createUserSchema>

interface UserFormProps {
  initialData?: {
    id: string
    name?: string | null
    email: string
    client?: {
      id: string
      name: string
      plan: string
      phone?: string | null
      oneSignalAppId?: string | null
      oneSignalApiKey?: string | null
    } | null
  } | null
}

export function UserForm({ initialData }: UserFormProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Usar el esquema apropiado según si es creación o edición
  const schema = initialData ? editUserSchema : createUserSchema

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      password: '',
      clientName: initialData?.client?.name || '',
      phone: initialData?.client?.phone || '',
      oneSignalAppId: initialData?.client?.oneSignalAppId || '',
      oneSignalApiKey: initialData?.client?.oneSignalApiKey || '',
    },
  })

  const onSubmit = async (data: UserInput) => {
    setLoading(true)
    try {
      const url = initialData 
        ? `/api/admin/users/${initialData.id}` 
        : '/api/admin/users'
      
      const response = await fetch(url, {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/admin/users')
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar el usuario')
      }
    } catch (error) {
      alert('Error al guardar el usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="form-group">
          <label htmlFor="name" className="form-label">
            Nombre Completo *
          </label>
          <input
            type="text"
            id="name"
            className="form-input"
            placeholder="Ej: Juan Pérez"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-red-400">{errors.name.message}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email *
          </label>
          <input
            type="email"
            id="email"
            className="form-input"
            placeholder="juan@ejemplo.com"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-red-400">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">
          Contraseña {initialData ? '(dejar vacío para mantener actual)' : '*'}
        </label>
        <input
          type="password"
          id="password"
          className="form-input"
          placeholder="••••••••"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-red-400">{errors.password.message}</p>
        )}
      </div>

      <div className="border-t border-gray-700 pt-6">
        <h3 className="text-lg font-medium text-white mb-4">
          Información del Proyecto
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="form-group">
            <label htmlFor="clientName" className="form-label">
              Nombre del Proyecto *
            </label>
            <input
              type="text"
              id="clientName"
              className="form-input"
              placeholder="Ej: Radio Ejemplo FM"
              {...register('clientName')}
            />
            {errors.clientName && (
              <p className="text-sm text-red-400">{errors.clientName.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              WhatsApp (con código de país)
            </label>
            <input
              type="tel"
              id="phone"
              className="form-input"
              placeholder="56912345678"
              {...register('phone')}
            />
            <p className="text-xs text-gray-400 mt-1">
              Formato: 56 9 XXXX XXXX (sin +). Se usa para enviar la cuenta del mes.
            </p>
          </div>
        </div>

        <div className="form-group mt-6">
          <label className="form-label">
            Plan
          </label>
          <div className="form-input bg-gray-700 text-gray-400 cursor-not-allowed">
            Se asignará después de crear el usuario
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Los planes se gestionan desde el módulo de facturación
          </p>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
          <svg className="w-5 h-5 text-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Configuración OneSignal (Notificaciones Push)
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Configura las credenciales de OneSignal para habilitar notificaciones push en la PWA del cliente
        </p>
        
        <div className="grid grid-cols-1 gap-6">
          <div className="form-group">
            <label htmlFor="oneSignalAppId" className="form-label">
              OneSignal App ID
            </label>
            <input
              type="text"
              id="oneSignalAppId"
              className="form-input font-mono text-sm"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              {...register('oneSignalAppId')}
            />
            <p className="text-xs text-gray-400 mt-1">
              ID de la aplicación en OneSignal (formato UUID). Ejemplo: 12345678-1234-1234-1234-123456789012
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="oneSignalApiKey" className="form-label">
              OneSignal REST API Key
            </label>
            <div className="relative">
              <input
                type="password"
                id="oneSignalApiKey"
                className="form-input font-mono text-sm pr-10"
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                autoComplete="off"
                {...register('oneSignalApiKey')}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                onClick={(e) => {
                  const input = (e.target as HTMLElement).parentElement?.querySelector('input')
                  if (input) {
                    input.type = input.type === 'password' ? 'text' : 'password'
                  }
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Clave de API REST para enviar notificaciones. Se almacena encriptada.
            </p>
          </div>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mt-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-purple-300 mb-1">
                ¿Cómo obtener estas credenciales?
              </h4>
              <ol className="text-sm text-purple-200/80 space-y-1 list-decimal list-inside">
                <li>Crea una cuenta en <a href="https://onesignal.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">OneSignal.com</a></li>
                <li>Crea una nueva aplicación (App)</li>
                <li>Ve a Settings → Keys & IDs</li>
                <li>Copia el "App ID" y "REST API Key"</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-300 mb-1">
              Información importante
            </h4>
            <p className="text-sm text-blue-200/80">
              {initialData 
                ? 'Al actualizar este usuario, los cambios se aplicarán inmediatamente. Si cambias la contraseña, el usuario deberá usar la nueva para iniciar sesión.'
                : 'Se creará automáticamente una cuenta de cliente asociada al usuario. El usuario podrá iniciar sesión inmediatamente con las credenciales proporcionadas.'
              }
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? 'Guardando...' : (initialData ? 'Actualizar Usuario' : 'Crear Usuario')}
        </button>
      </div>
    </form>
  )
}