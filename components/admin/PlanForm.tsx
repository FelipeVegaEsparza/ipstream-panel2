'use client'

import { useRouter } from 'next/navigation'

import { showToast } from '@/components/ui/toast'

import { useState, useEffect } from 'react'
import { ONBOARDING_STEP_DEFS } from '@/lib/onboarding-steps'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { X, Plus, Trash2 } from 'lucide-react'
import { MENU_ITEMS, MENU_SECTIONS } from '@/lib/menu-items'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { adminMenuName, adminSectionName } from '@/lib/dashboard-i18n'
import { ImageUpload } from '@/components/ui/ImageUpload'

interface Plan {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: string
  features: string
  isActive: boolean
  services: string
  prices?: { currency: string; amount: number }[]
  onboardingSteps?: string | null
  radioStorageQuotaMB: number | null
  videoStorageQuotaMB: number | null
  aiLiveEnabled: boolean
  aiMonthlyCharacters: number
  aiMusicMinutes: number
  menuHiddenKeys: string | null
  defaultServerId: string | null
  imageUrl: string | null
  demoUrl: string | null
}

interface PlanFormProps {
  plan?: Plan | null
  onClose: () => void
}

export function PlanForm({ plan, onClose }: PlanFormProps) {
  const { locale, t } = useDashboardI18n()
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    description: plan?.description || '',
    price: plan?.price || 0,
    currency: plan?.currency || 'CLP',
    interval: plan?.interval || 'monthly',
    isActive: plan?.isActive ?? true,
    services: plan?.services || 'both',
    radioStorageQuotaMB: plan?.radioStorageQuotaMB?.toString() || '',
    videoStorageQuotaMB: plan?.videoStorageQuotaMB?.toString() || '',
    aiLiveEnabled: plan?.aiLiveEnabled ?? false,
    aiMonthlyCharacters: plan?.aiMonthlyCharacters?.toString() || '',
    aiMusicMinutes: plan?.aiMusicMinutes?.toString() || '',
    defaultServerId: plan?.defaultServerId || '',
    imageUrl: plan?.imageUrl || '',
    demoUrl: plan?.demoUrl || '',
  })

  // Tareas de "Primeros pasos" seleccionadas para este plan (default: todas).
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const p of plan?.prices ?? []) map[p.currency] = String(p.amount)
    return map
  })

  const [selectedSteps, setSelectedSteps] = useState<Set<string>>(() => {
    try {
      const arr = plan?.onboardingSteps ? JSON.parse(plan.onboardingSteps) : null
      if (Array.isArray(arr)) {
        const keys = arr.filter((k: unknown): k is string => typeof k === 'string')
        if (keys.length) return new Set(keys)
      }
    } catch {}
    return new Set(ONBOARDING_STEP_DEFS.map((s) => s.key))
  })

  const toggleStep = (key: string) =>
    setSelectedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const [servers, setServers] = useState<{ id: string; name: string; type: string }[]>([])
  useEffect(() => {
    fetch('/api/admin/servers')
      .then((r) => r.json())
      .then((d) => setServers(d?.servers || []))
      .catch(() => {})
  }, [])

  const [features, setFeatures] = useState<string[]>(
    plan ? JSON.parse(plan.features || '[]') : ['']
  )

  // Secciones ocultas del plan (items del dashboard que NO incluye)
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => {
    try {
      const arr = JSON.parse(plan?.menuHiddenKeys || '[]')
      return new Set<string>(Array.isArray(arr) ? arr.filter((x: unknown) => typeof x === 'string') : [])
    } catch {
      return new Set<string>()
    }
  })

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = plan ? `/api/admin/plans/${plan.id}` : '/api/admin/plans'
      const method = plan ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          features: JSON.stringify(features.filter(f => f.trim() !== '')),
          radioStorageQuotaMB: formData.radioStorageQuotaMB === '' ? null : Number(formData.radioStorageQuotaMB),
          videoStorageQuotaMB: formData.videoStorageQuotaMB === '' ? null : Number(formData.videoStorageQuotaMB),
          menuHiddenKeys: Array.from(hiddenKeys),
          onboardingSteps: Array.from(selectedSteps),
          prices: Object.entries(prices)
            .filter(([, v]) => v !== '' && Number(v) > 0)
            .map(([currency, v]) => ({ currency, amount: Number(v) })),
        })
      })

      if (response.ok) {
        router.refresh()
      } else {
        const error = await response.json().catch(() => ({}))
        console.error('[PlanForm] save error', response.status, error)
        showToast({ type: 'error', title: error.message || error.error || t('admin.planForm.saveError') })
      }
    } catch (error) {
      console.error('[PlanForm] save exception', error)
      showToast({ type: 'error', title: t('admin.planForm.saveError') })
    } finally {
      setLoading(false)
    }
  }

  const stepTitle = (key: string, fallback: string) => {
    const map: Record<string, string> = {
      brand: t('admin.planForm.onboarding.brand'),
      programs: t('admin.planForm.onboarding.programs'),
      'radio-library': t('admin.planForm.onboarding.radio-library'),
      'radio-autodj': t('admin.planForm.onboarding.radio-autodj'),
      'tv-library': t('admin.planForm.onboarding.tv-library'),
      'tv-autodj': t('admin.planForm.onboarding.tv-autodj'),
      news: t('admin.planForm.onboarding.news'),
      site: t('admin.planForm.onboarding.site'),
      'gc-bar': t('admin.planForm.onboarding.gc-bar'),
    }
    return locale === 'en' ? map[key] ?? fallback : fallback
  }

  const addFeature = () => {
    setFeatures([...features, ''])
  }

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index))
  }

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...features]
    newFeatures[index] = value
    setFeatures(newFeatures)
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">
          {plan ? t('admin.planForm.edit') : t('admin.planForm.new')}
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="border-border hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                {t('admin.planForm.name')}
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('admin.planForm.namePlaceholder')}
                required
                className="bg-secondary border-border text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                {t('admin.planForm.price')}
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  required
                  className="bg-secondary border-border text-foreground"
                />
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="bg-secondary border border-border text-foreground rounded-md px-3 py-2"
                >
                  <option value="CLP">CLP (Peso Chileno)</option>
                  <option value="USD">USD (Dólar)</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('admin.planForm.pricesByCurrency')}
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              {t('admin.planForm.pricesByCurrencyHint')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">CLP</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={prices.CLP ?? ''}
                  onChange={(e) => setPrices({ ...prices, CLP: e.target.value })}
                  placeholder="0"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">USD</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={prices.USD ?? ''}
                  onChange={(e) => setPrices({ ...prices, USD: e.target.value })}
                  placeholder="0.00"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('admin.planForm.description')}
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('admin.planForm.descriptionPlaceholder')}
              required
              className="bg-secondary border-border text-foreground"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('admin.planForm.image')}
            </label>
            <ImageUpload
              value={formData.imageUrl}
              onChange={(url) => setFormData({ ...formData, imageUrl: url })}
              onRemove={() => setFormData({ ...formData, imageUrl: '' })}
              label={t('admin.planForm.imageLabel')}
              description={t('admin.planForm.imageDescription')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('admin.planForm.demoUrl')}
            </label>
            <Input
              type="url"
              value={formData.demoUrl}
              onChange={(e) => setFormData({ ...formData, demoUrl: e.target.value })}
              placeholder="https://radio.casterfly.com"
              className="bg-secondary border-border text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin.planForm.demoUrlHint')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('admin.planForm.interval')}
            </label>
            <select
              value={formData.interval}
              onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
              className="w-full bg-secondary border border-border text-foreground rounded-md px-3 py-2"
            >
              <option value="monthly">{t('admin.planForm.monthly')}</option>
              <option value="yearly">{t('admin.planForm.yearly')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('admin.planForm.services')}
            </label>
            <select
              value={formData.services}
              onChange={(e) => setFormData({ ...formData, services: e.target.value })}
              className="w-full bg-secondary border border-border text-foreground rounded-md px-3 py-2"
            >
              <option value="both">Radio + TV</option>
              <option value="radio">{t('admin.plans.radioOnly')}</option>
              <option value="tv">{t('admin.plans.tvOnly')}</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin.planForm.servicesHint')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('admin.planForm.onboarding')}
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              {t('admin.planForm.onboardingHint')}
            </p>
            <div className="space-y-2 rounded-md border border-border bg-card/40 p-3">
              {ONBOARDING_STEP_DEFS.map((s) => (
                <label key={s.key} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSteps.has(s.key)}
                    onChange={() => toggleStep(s.key)}
                    className="mt-0.5 h-4 w-4 rounded border-border bg-secondary text-brand"
                  />
                  <span className="text-sm text-muted-foreground">
                    {stepTitle(s.key, s.title)}
                    {s.service !== 'common' && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide rounded bg-secondary px-1.5 py-0.5 text-muted-foreground">
                        {s.service === 'radio' ? 'Radio' : 'TV'}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-secondary/40 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">{t('admin.planForm.aiLive')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('admin.planForm.aiLiveHint')}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={formData.aiLiveEnabled}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    aiLiveEnabled: e.target.checked,
                    ...(e.target.checked && !formData.aiMonthlyCharacters
                      ? { aiMonthlyCharacters: '100000' }
                      : {}),
                  })
                }
                className="rounded border-border bg-secondary"
              />
              {t('admin.planForm.aiInclude')}
            </label>
            <div className="grid gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {t('admin.planForm.aiCharacters')}
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.aiMonthlyCharacters}
                  onChange={(e) => setFormData({ ...formData, aiMonthlyCharacters: e.target.value })}
                  placeholder={t('admin.planForm.aiCharactersPlaceholder')}
                  className="bg-secondary border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('admin.planForm.aiCharactersHint')}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('admin.planForm.defaultServer')}
            </label>
            <select
              value={formData.defaultServerId}
              onChange={(e) => setFormData({ ...formData, defaultServerId: e.target.value })}
              className="w-full bg-secondary border border-border text-foreground rounded-md px-3 py-2"
            >
              <option value="">{t('admin.planForm.defaultServerOption')}</option>
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.type === 'radio' ? 'Radio' : s.type === 'tv' ? 'TV' : 'Radio+TV'})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin.planForm.defaultServerHint')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('admin.planForm.storageQuota')}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('admin.planForm.radioMB')}</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.radioStorageQuotaMB}
                  onChange={(e) => setFormData({ ...formData, radioStorageQuotaMB: e.target.value })}
                  placeholder="ej: 5000 (5 GB)"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('admin.planForm.videoMB')}</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.videoStorageQuotaMB}
                  onChange={(e) => setFormData({ ...formData, videoStorageQuotaMB: e.target.value })}
                  placeholder="ej: 20000 (20 GB)"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('admin.planForm.storageHint')}
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-muted-foreground">
                {t('admin.planForm.features')}
              </label>              <Button
                type="button"
                onClick={addFeature}
                size="sm"
                className="bg-brand hover:bg-brand"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('admin.planForm.addFeature')}
              </Button>
            </div>
            
            <div className="space-y-2">
              {features.map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    placeholder={t('admin.planForm.featurePlaceholder')}
                    className="bg-secondary border-border text-foreground"
                  />
                  {features.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeFeature(index)}
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('admin.planForm.sections')}
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              {t('admin.planForm.sectionsHint')}
            </p>
            <div className="space-y-4">
              {MENU_SECTIONS.map((section) => {
                const items = MENU_ITEMS.filter((i) => i.section === section)
                if (items.length === 0) return null
                return (
                  <div key={section} className="rounded-lg bg-secondary/40 border border-border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{adminSectionName(locale, section)}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {items.map((item) => {
                        const checked = !hiddenKeys.has(item.key)
                        const isServiceSection = section === 'Radio' || section === 'Televisión'
                        return (
                          <label
                            key={item.key}
                            className={`flex items-center gap-2 text-sm ${isServiceSection ? '' : 'text-muted-foreground'}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = new Set(hiddenKeys)
                                if (e.target.checked) next.delete(item.key)
                                else next.add(item.key)
                                setHiddenKeys(next)
                              }}
                              className="rounded border-border bg-card"
                            />
                            <span className={checked ? 'text-foreground' : 'text-muted-foreground line-through'}>{adminMenuName(locale, item.name)}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-border bg-secondary"
            />
            <label htmlFor="isActive" className="text-sm text-muted-foreground">
              {t('admin.planForm.active')}
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-brand hover:bg-brand flex-1"
            >
              {loading ? t('common.saving') : (plan ? t('admin.planForm.update') : t('admin.planForm.create'))}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="border-border hover:bg-secondary"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}