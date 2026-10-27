'use client'

import { useCallback, useEffect, useState } from 'react'
import { Globe2, Loader2, Plus, RotateCcw, Save, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { showToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import type { DashboardTranslationKey } from '@/lib/dashboard-i18n'
import {
  SITE_COLLECTIONS,
  SITE_CONTENT_TABS,
  type SiteCollectionConfig,
  type SiteCollectionKey,
  type SiteFieldKind,
} from '@/lib/site-content-fields'
import type { SiteContent, SiteContentLocale } from '@/lib/site-content'

interface SiteContentResponse {
  locale: SiteContentLocale
  content: SiteContent | null
  version: number
  updatedAt: string
}

const SITE_URL = 'https://casterfly.com'

function readGlobal(global: SiteContent['global'], path: string): unknown {
  const [first, second] = path.split('.')
  const group = global as unknown as Record<string, unknown>
  if (!second) return group[first] ?? ''
  const nested = group[first] as Record<string, unknown> | undefined
  return nested?.[second] ?? ''
}

function updateGlobalValue(
  content: SiteContent,
  path: string,
  value: unknown
): SiteContent {
  const [first, second] = path.split('.')
  if (!second) {
    return {
      ...content,
      global: { ...content.global, [first]: value } as SiteContent['global'],
    }
  }
  const group = (content.global as unknown as Record<string, unknown>)[first] as
    | Record<string, unknown>
    | undefined
  return {
    ...content,
    global: {
      ...content.global,
      [first]: { ...(group ?? {}), [second]: value },
    } as SiteContent['global'],
  }
}

function prettyDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
}

function ImageControl({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  const { t } = useDashboardI18n()
  const [uploading, setUploading] = useState(false)
  const preview = value.startsWith('/') ? `${SITE_URL}${value}` : value

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Error al subir')
      onChange(new URL(data.url, window.location.origin).toString())
    } catch (error) {
      showToast({
        type: 'error',
        title: error instanceof Error ? error.message : 'No se pudo subir la imagen',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      {preview && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-2">
          <img
            src={preview}
            alt={label}
            className="h-14 w-20 rounded object-cover"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('admin.siteContent.removeImage')}
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/images/... o https://panel.casterfly.com/api/uploads/..."
          className="min-w-[220px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
        />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:border-brand">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? t('admin.siteContent.uploading') : t('admin.siteContent.uploadImage')}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleFile(file)
              event.target.value = ''
            }}
          />
        </label>
      </div>
    </div>
  )
}

function AudioControl({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  const { t } = useDashboardI18n()
  const [uploading, setUploading] = useState(false)
  const preview = value.startsWith('/') ? `${SITE_URL}${value}` : value

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Error al subir')
      onChange(new URL(data.url, window.location.origin).toString())
    } catch (error) {
      showToast({
        type: 'error',
        title: error instanceof Error ? error.message : 'No se pudo subir el audio',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      {preview && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/40 p-2">
          <audio controls preload="none" src={preview} className="h-10 max-w-full" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('admin.siteContent.removeAudio')}
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/audio/... o https://panel.casterfly.com/api/uploads/..."
          className="min-w-[220px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
        />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:border-brand">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? t('admin.siteContent.uploading') : t('admin.siteContent.uploadImage')}
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleFile(file)
              event.target.value = ''
            }}
          />
        </label>
      </div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

function FieldControl({
  id,
  label,
  kind = 'text',
  value,
  help,
  onChange,
}: {
  id: string
  label: string
  kind?: SiteFieldKind
  value: unknown
  help?: string
  onChange: (value: unknown) => void
}) {
  const { t } = useDashboardI18n()
  const stringValue = typeof value === 'string' ? value : ''
  const listValue = Array.isArray(value) ? value.join('\n') : ''

  if (kind === 'image') {
    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-muted-foreground">{label}</label>
        <ImageControl value={stringValue} onChange={onChange} label={label} />
      </div>
    )
  }

  if (kind === 'audio') {
    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-muted-foreground">{label}</label>
        <AudioControl value={stringValue} onChange={onChange} label={label} />
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {kind === 'textarea' || kind === 'lines' ? (
        <textarea
          id={id}
          value={kind === 'lines' ? listValue : stringValue}
          onChange={(event) =>
            onChange(
              kind === 'lines'
                ? event.target.value.split('\n').map((line) => line.trim()).filter(Boolean)
                : event.target.value
            )
          }
          rows={kind === 'lines' ? 4 : 3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
        />
      ) : (
        <input
          id={id}
          type={kind === 'email' ? 'email' : kind === 'url' ? 'url' : 'text'}
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
        />
      )}
      {help && <p className="text-[11px] text-muted-foreground">{help}</p>}
      {kind === 'lines' && (
        <p className="text-[11px] text-muted-foreground">{t('admin.siteContent.pointsHint')}</p>
      )}
    </div>
  )
}

function CollectionEditor({
  config,
  items,
  onChange,
}: {
  config: SiteCollectionConfig
  items: Array<Record<string, unknown>>
  onChange: (items: Array<Record<string, unknown>>) => void
}) {
  const { t } = useDashboardI18n()

  const updateItem = (index: number, path: string, value: unknown) => {
    onChange(
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [path]: value } : item
      )
    )
  }

  const addItem = () => {
    const next = config.create()
    if ('code' in next && !next.code) {
      next.code = String(items.length + 1).padStart(2, '0')
    }
    onChange([...items, next])
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
          <p className="text-xs text-muted-foreground">
            {items.length} {config.itemLabel.toLowerCase()}(s)
          </p>
        </div>
        <Button type="button" variant="outline" onClick={addItem} className="gap-1">
          <Plus className="h-4 w-4" />
          {t('admin.siteContent.addItem')}
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('admin.siteContent.noItems')}</p>
      )}

      <div className="space-y-3">
        {items.map((item, index) => (
          <details
            key={`${config.key}-${index}`}
            className="rounded-lg border border-border bg-background/40"
            open={index === 0}
          >
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground">
              <span>
                {index + 1}. {String(item.title ?? item.question ?? config.itemLabel)}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  onChange(items.filter((_, itemIndex) => itemIndex !== index))
                }}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('admin.siteContent.removeItem')}
              </button>
            </summary>
            <div className="grid gap-4 border-t border-border p-4 md:grid-cols-2">
              {config.fields.map((field) => (
                <div key={field.path} className={field.kind === 'textarea' ? 'md:col-span-2' : ''}>
                  <FieldControl
                    id={`${config.key}-${index}-${field.path}`}
                    label={field.label}
                    kind={field.kind}
                    help={field.help}
                    value={item[field.path]}
                    onChange={(value) => updateItem(index, field.path, value)}
                  />
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

export function SiteContentEditor() {
  const { t } = useDashboardI18n()
  const [locale, setLocale] = useState<SiteContentLocale>('es')
  const [content, setContent] = useState<SiteContent | null>(null)
  const [version, setVersion] = useState(0)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(SITE_CONTENT_TABS[0].id)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (targetLocale: SiteContentLocale) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/site-content?locale=${targetLocale}`, {
        cache: 'no-store',
      })
      const data = (await res.json()) as SiteContentResponse & { error?: string }
      if (!res.ok) throw new Error(data.error || t('admin.siteContent.loadError'))
      setContent(data.content)
      setVersion(data.version)
      setUpdatedAt(data.updatedAt)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('admin.siteContent.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load(locale)
  }, [load, locale])

  const updateI18n = (key: string, value: string) => {
    setContent((prev) =>
      prev ? { ...prev, i18n: { ...prev.i18n, [key]: value } } : prev
    )
  }

  const updateGlobal = (path: string, value: unknown) => {
    setContent((prev) => (prev ? updateGlobalValue(prev, path, value) : prev))
  }

  const updateCollection = (key: SiteCollectionKey, items: Array<Record<string, unknown>>) => {
    setContent((prev) =>
      prev
        ? {
            ...prev,
            collections: {
              ...prev.collections,
              [key]: items,
            },
          }
        : prev
    )
  }

  const save = async () => {
    if (!content) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/site-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, version, content }),
      })
      const data = (await res.json()) as SiteContentResponse & {
        error?: string
        currentVersion?: number
      }
      if (!res.ok) {
        if (res.status === 409) {
          setError(t('admin.siteContent.versionConflict'))
          setVersion(data.currentVersion ?? version)
          return
        }
        setError(data.error || t('admin.siteContent.saveError'))
        return
      }
      setContent(data.content)
      setVersion(data.version)
      setUpdatedAt(data.updatedAt)
      showToast({ type: 'success', title: t('admin.siteContent.saved') })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('admin.siteContent.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('admin.siteContent.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('admin.siteContent.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={SITE_URL}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:border-brand hover:text-brand"
          >
            <Globe2 className="h-4 w-4" />
            {t('admin.siteContent.viewSite')}
          </a>
          <Button onClick={() => void save()} disabled={saving || loading || !content} className="gap-2 bg-brand hover:bg-brand/90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? t('admin.siteContent.saving') : t('admin.siteContent.save')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
          {(['es', 'en'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setLocale(value)}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                locale === value ? 'bg-brand text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {value === 'es' ? t('admin.siteContent.localeEs') : t('admin.siteContent.localeEn')}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {t('admin.siteContent.lastUpdated')}: {prettyDate(updatedAt)}
        </span>
        <span className="text-xs text-muted-foreground">{t('admin.siteContent.cacheNote')}</span>
        <button
          type="button"
          onClick={() => void load(locale)}
          className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t('admin.siteContent.reload')}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('admin.siteContent.loading')}</p>
      ) : !content ? (
        <p className="text-sm text-muted-foreground">{t('admin.siteContent.loadError')}</p>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-card p-1">
            {SITE_CONTENT_TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="data-[state=active]:bg-brand data-[state=active]:text-white"
              >
                {t(tab.labelKey as DashboardTranslationKey)}
              </TabsTrigger>
            ))}
          </TabsList>

          {SITE_CONTENT_TABS.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="space-y-4">
              {tab.globalFields && tab.globalFields.length > 0 && (
                <section className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2">
                  {tab.globalFields.map((field) => (
                    <FieldControl
                      key={field.path}
                      id={`global-${field.path}`}
                      label={field.label}
                      kind={field.kind}
                      value={readGlobal(content.global, field.path)}
                      onChange={(value) => updateGlobal(field.path, value)}
                    />
                  ))}
                </section>
              )}

              {tab.i18nFields.length > 0 && (
                <section className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2">
                  {tab.i18nFields.map((field) => (
                    <div key={field.key} className={field.kind === 'textarea' ? 'md:col-span-2' : ''}>
                      <FieldControl
                        id={`i18n-${field.key}`}
                        label={field.label}
                        kind={field.kind}
                        help={field.help}
                        value={content.i18n[field.key] ?? ''}
                        onChange={(value) => updateI18n(field.key, String(value ?? ''))}
                      />
                    </div>
                  ))}
                </section>
              )}

              {tab.collectionKeys?.map((key) => (
                <CollectionEditor
                  key={key}
                  config={SITE_COLLECTIONS[key]}
                  items={content.collections[key] as unknown as Array<Record<string, unknown>>}
                  onChange={(items) => updateCollection(key, items)}
                />
              ))}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
