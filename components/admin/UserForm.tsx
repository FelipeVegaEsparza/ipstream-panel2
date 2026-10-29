'use client'

import { showToast } from '@/components/ui/toast'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import type { DashboardTranslationKey } from '@/lib/dashboard-i18n'

// Esquema para crear usuario (contraseña requerida)
const createUserSchema = z.object({
  name: z.string().min(1, 'admin.userForm.nameRequired'),
  email: z.string().email('admin.userForm.invalidEmail'),
  password: z.string().min(6, 'admin.userForm.passwordMin'),
  clientName: z.string().min(1, 'admin.userForm.clientNameRequired'),
  phone: z.string().optional().transform(val => val?.trim() || undefined),
  websiteUrl: z.string().url('admin.userForm.invalidUrl').optional().or(z.literal('')),
  oneSignalAppId: z.string().optional().transform(val => val?.trim() || undefined),
  oneSignalApiKey: z.string().optional().transform(val => val?.trim() || undefined),
  oneSignalSafariWebId: z.string().optional().transform(val => val?.trim() || undefined),
  radioServerId: z.string().optional().transform(val => val?.trim() || undefined),
  videoServerId: z.string().optional().transform(val => val?.trim() || undefined),
})

// Esquema para editar usuario (contraseña opcional)
const editUserSchema = z.object({
  name: z.string().min(1, 'admin.userForm.nameRequired'),
  email: z.string().email('admin.userForm.invalidEmail'),
  password: z.string().optional().refine(
    (val) => !val || val.length >= 6,
    'admin.userForm.passwordMin'
  ),
  clientName: z.string().min(1, 'admin.userForm.clientNameRequired'),
  phone: z.string().optional().transform(val => val?.trim() || undefined),
  websiteUrl: z.string().url('admin.userForm.invalidUrl').optional().or(z.literal('')),
  oneSignalAppId: z.string().optional().transform(val => val?.trim() || undefined),
  oneSignalApiKey: z.string().optional().transform(val => val?.trim() || undefined),
  oneSignalSafariWebId: z.string().optional().transform(val => val?.trim() || undefined),
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
      websiteUrl?: string | null
      oneSignalAppId?: string | null
      oneSignalApiKey?: string | null
      oneSignalSafariWebId?: string | null
    } | null
  } | null
}

interface ServerOption {
  id: string
  name: string
  type: string
}

export function UserForm({ initialData }: UserFormProps) {
  const { t } = useDashboardI18n()
  const [loading, setLoading] = useState(false)
  const [servers, setServers] = useState<ServerOption[]>([])
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
      websiteUrl: initialData?.client?.websiteUrl || '',
      oneSignalAppId: initialData?.client?.oneSignalAppId || '',
      oneSignalApiKey: initialData?.client?.oneSignalApiKey || '',
      oneSignalSafariWebId: initialData?.client?.oneSignalSafariWebId || '',
    },
  })

  useEffect(() => {
    // Solo en creación: listar servidores para asignar radio y/o TV
    if (initialData) return
    fetch('/api/admin/servers')
      .then((r) => r.json())
      .then((data) => setServers(data?.servers || []))
      .catch(() => {})
  }, [initialData])

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
        showToast({ type: 'error', title: error.error || t('admin.userForm.saveError') })
      }
    } catch (error) {
      showToast({ type: 'error', title: t('admin.userForm.saveError') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="form-group">
          <label htmlFor="name" className="form-label">
            {t('admin.userForm.fullName')}
          </label>
          <input
            type="text"
            id="name"
            className="form-input"
            placeholder={t('admin.userForm.fullNamePlaceholder')}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-red-400">{t(errors.name.message as DashboardTranslationKey)}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="email" className="form-label">
            {t('admin.userForm.email')}
          </label>
          <input
            type="email"
            id="email"
            className="form-input"
            placeholder="juan@ejemplo.com"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-red-400">{t(errors.email.message as DashboardTranslationKey)}</p>
          )}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">
          {t('admin.userForm.password', { hint: initialData ? t('admin.userForm.keepCurrent') : '*' })}
        </label>
        <input
          type="password"
          id="password"
          className="form-input"
          placeholder="••••••••"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-red-400">{t(errors.password.message as DashboardTranslationKey)}</p>
        )}
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="text-lg font-medium text-foreground mb-4">
          {t('admin.userForm.projectInfo')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="form-group">
            <label htmlFor="clientName" className="form-label">
              {t('admin.userForm.projectName')}
            </label>
            <input
              type="text"
              id="clientName"
              className="form-input"
              placeholder={t('admin.userForm.projectNamePlaceholder')}
              {...register('clientName')}
            />
            {errors.clientName && (
              <p className="text-sm text-red-400">{t(errors.clientName.message as DashboardTranslationKey)}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              {t('admin.userForm.whatsapp')}
            </label>
            <input
              type="tel"
              id="phone"
              className="form-input"
              placeholder="56912345678"
              {...register('phone')}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin.userForm.whatsappHint')}
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="websiteUrl" className="form-label">
              {t('admin.userForm.website')}
            </label>
            <input
              type="url"
              id="websiteUrl"
              className="form-input"
              placeholder="https://midominio.cl"
              {...register('websiteUrl')}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin.userForm.websiteHint')}
            </p>
            {errors.websiteUrl && (
              <p className="text-sm text-red-400">{t(errors.websiteUrl.message as DashboardTranslationKey)}</p>
            )}
          </div>
        </div>

        <div className="form-group mt-6">
          <label className="form-label">
            {t('admin.userForm.plan')}
          </label>
          <div className="form-input bg-secondary text-muted-foreground cursor-not-allowed">
            {t('admin.userForm.planAfterCreate')}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('admin.userForm.planHint')}
          </p>
        </div>

        {!initialData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-group">
              <label htmlFor="radioServerId" className="form-label">
                {t('admin.userForm.radioServer')}
              </label>
              <select id="radioServerId" className="form-input" {...register('radioServerId')}>
                <option value="">{t('admin.userForm.autoServer')}</option>
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.type === 'radio' ? 'Radio' : s.type === 'tv' ? 'TV' : 'Radio+TV'})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {t('admin.userForm.radioServerHint')}
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="videoServerId" className="form-label">
                {t('admin.userForm.videoServer')}
              </label>
              <select id="videoServerId" className="form-input" {...register('videoServerId')}>
                <option value="">{t('admin.userForm.autoServer')}</option>
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.type === 'radio' ? 'Radio' : s.type === 'tv' ? 'TV' : 'Radio+TV'})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {t('admin.userForm.videoServerHint')}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
          <svg className="w-5 h-5 text-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {t('admin.userForm.oneSignal')}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('admin.userForm.oneSignalHint')}
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
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin.userForm.appIdHint')}
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="oneSignalSafariWebId" className="form-label">
              {t('admin.userForm.safariId')}
            </label>
            <input
              type="text"
              id="oneSignalSafariWebId"
              className="form-input font-mono text-sm"
              placeholder="web.onesignal.auto.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              {...register('oneSignalSafariWebId')}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin.userForm.safariIdHint')}
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="oneSignalApiKey" className="form-label">
              {t('admin.userForm.apiKey')}
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
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-muted-foreground"
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
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin.userForm.apiKeyHint')}
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
                {t('admin.userForm.howToGet')}
              </h4>
              <ol className="text-sm text-purple-200/80 space-y-1 list-decimal list-inside">
                <li>{t('admin.userForm.howTo1')} <a href="https://onesignal.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">OneSignal.com</a></li>
                <li>{t('admin.userForm.howTo2')}</li>
                <li>{t('admin.userForm.howTo3')}</li>
                <li>{t('admin.userForm.howTo4')}</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-brand/10 border border-brand/30 rounded-panel p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-brand mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-brand mb-1">
              {t('admin.userForm.important')}
            </h4>
            <p className="text-sm text-brand/80">
              {initialData 
                ? t('admin.userForm.importantEdit')
                : t('admin.userForm.importantCreate')
              }
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-border">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? t('common.saving') : (initialData ? t('admin.userForm.updateUser') : t('admin.userForm.createUser'))}
        </button>
      </div>
    </form>
  )
}